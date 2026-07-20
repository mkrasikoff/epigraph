package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.achievement.AchievementStatusResponse;
import com.mkrasikoff.epigraph.dto.friend.FriendProfileResponse;
import com.mkrasikoff.epigraph.dto.friend.UserSummaryResponse;
import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.model.Friendship;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.FriendshipRepository;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Two-sided friendships with mutual confirmation (TASK-129). A request is one
 * directed {@link Friendship} row (PENDING); accepting flips it to ACCEPTED.
 * Decline / cancel / remove all delete the row — see the 019 migration comment.
 *
 * All mutators take the acting user's id as the first argument and only ever
 * touch a relationship that user is part of, so one user can never accept,
 * decline, or remove someone else's friendship.
 */
@Service
public class FriendshipService {

    /**
     * The acting user's relationship to another user, used to pick the right
     * action button in search results and on the friend's profile.
     */
    public enum RelationStatus { NONE, OUTGOING, INCOMING, FRIENDS }

    /**
     * Shortest query the user search will act on — one letter would match a
     * large slice of the user base for no useful signal.
     */
    private static final int MIN_SEARCH_LENGTH = 2;

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final QuoteRepository quoteRepository;
    private final AchievementService achievementService;

    public FriendshipService(FriendshipRepository friendshipRepository,
                             UserRepository userRepository,
                             QuoteRepository quoteRepository,
                             AchievementService achievementService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.quoteRepository = quoteRepository;
        this.achievementService = achievementService;
    }

    /**
     * Sends a friend request from requester to addressee. If the addressee had
     * already sent the requester a pending request, the two collapse into an
     * accepted friendship instead of creating a second row.
     */
    @Transactional
    public void sendRequest(Long requesterId, Long addresseeId) {
        if (requesterId.equals(addresseeId)) {
            throw new IllegalArgumentException(ApiCodes.CANNOT_FRIEND_SELF);
        }
        if (!userRepository.existsById(addresseeId)) {
            throw new IllegalArgumentException(ApiCodes.USER_NOT_FOUND);
        }

        Optional<Friendship> outgoing = friendshipRepository.findByRequesterIdAndAddresseeId(requesterId, addresseeId);
        Optional<Friendship> incoming = friendshipRepository.findByRequesterIdAndAddresseeId(addresseeId, requesterId);

        if (isAccepted(outgoing) || isAccepted(incoming)) {
            throw new IllegalArgumentException(ApiCodes.ALREADY_FRIENDS);
        }
        if (outgoing.isPresent()) {
            throw new IllegalArgumentException(ApiCodes.REQUEST_ALREADY_SENT);
        }
        if (incoming.isPresent()) {
            accept(incoming.get());
            return;
        }

        Friendship friendship = new Friendship();
        friendship.setRequesterId(requesterId);
        friendship.setAddresseeId(addresseeId);
        friendship.setStatus(Friendship.STATUS_PENDING);
        friendship.setCreatedAt(System.currentTimeMillis());
        friendshipRepository.save(friendship);
    }

    /**
     * Accepts a pending request the given user received from requesterId.
     */
    @Transactional
    public void acceptRequest(Long userId, Long requesterId) {
        Friendship request = pendingIncoming(userId, requesterId);
        accept(request);
    }

    /**
     * Declines a pending request the given user received from requesterId (deletes it).
     */
    @Transactional
    public void declineRequest(Long userId, Long requesterId) {
        friendshipRepository.delete(pendingIncoming(userId, requesterId));
    }

    /**
     * Severs any tie between the user and otherId in either direction — an
     * accepted friendship (unfriend) or the user's own still-pending outgoing
     * request (cancel). Access to the other user's quotes drops with the row.
     */
    @Transactional
    public void removeFriend(Long userId, Long otherId) {
        Friendship friendship = friendshipRepository.findByRequesterIdAndAddresseeId(userId, otherId)
                .or(() -> friendshipRepository.findByRequesterIdAndAddresseeId(otherId, userId))
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.FRIENDSHIP_NOT_FOUND));
        friendshipRepository.delete(friendship);
    }

    /**
     * Every user the given user is accepted friends with.
     */
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listFriends(Long userId) {
        List<Long> friendIds = friendshipRepository.findAcceptedForUser(userId).stream()
                .map(friendship -> otherSide(friendship, userId))
                .toList();

        return toSummaries(friendIds, RelationStatus.FRIENDS);
    }

    /**
     * Every user who has a pending friend request out to the given user.
     */
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listIncomingRequests(Long userId) {
        List<Long> requesterIds = friendshipRepository.findByAddresseeIdAndStatus(userId, Friendship.STATUS_PENDING).stream()
                .map(Friendship::getRequesterId)
                .toList();

        return toSummaries(requesterIds, RelationStatus.INCOMING);
    }

    /**
     * How many friend requests await the user's answer. Drives the header badge
     * (TASK-129) — a count of live state, not a notification feed: answering a
     * request lowers it on its own, so there is no read/unread flag to store.
     */
    @Transactional(readOnly = true)
    public int countIncomingRequests(Long userId) {
        return (int) friendshipRepository.countByAddresseeIdAndStatus(userId, Friendship.STATUS_PENDING);
    }

    /**
     * Every user the given user has an outstanding request out to — so they can
     * see and cancel what they've already sent instead of re-sending blindly.
     */
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listOutgoingRequests(Long userId) {
        List<Long> addresseeIds = friendshipRepository.findByRequesterIdAndStatus(userId, Friendship.STATUS_PENDING).stream()
                .map(Friendship::getAddresseeId)
                .toList();

        return toSummaries(addresseeIds, RelationStatus.OUTGOING);
    }

    /**
     * Finds users to befriend by display name. Usernames are not unique and are
     * not identifiers, so this is a plain case-insensitive substring match,
     * capped by the repository; the caller disambiguates same-named people by
     * avatar/badge. Each hit carries the viewer's relationship to it so the
     * client can show the right button. Blank or one-character queries return
     * nothing rather than most of the user base.
     */
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> searchUsers(Long userId, String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() < MIN_SEARCH_LENGTH) {
            return List.of();
        }

        return userRepository.findTop20ByUsernameContainingIgnoreCaseAndIdNot(trimmed, userId).stream()
                .map(user -> new UserSummaryResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getAvatarIcon(),
                        user.getEquippedBadge(),
                        relationStatus(userId, user.getId()).name()))
                .toList();
    }

    /**
     * Another user's public profile. Readable by any signed-in user — it is the
     * surface you use to decide whether to send a request — so it carries only
     * public fields and never the target's quotes.
     */
    @Transactional(readOnly = true)
    public FriendProfileResponse getProfile(Long userId, Long targetId) {
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        List<String> unlockedAchievements = achievementService.getStatusForUser(targetId).stream()
                .filter(AchievementStatusResponse::isUnlocked)
                .map(AchievementStatusResponse::getKey)
                .toList();

        return new FriendProfileResponse(
                target.getId(),
                target.getUsername(),
                target.getAvatarIcon(),
                target.getEquippedBadge(),
                target.getThemeStyle(),
                target.getPlusSince() != null,
                target.getCreatedAt(),
                achievementService.currentStreak(targetId),
                quoteRepository.countByUserId(targetId),
                unlockedAchievements,
                relationStatus(userId, targetId).name());
    }

    /**
     * The acting user's relationship to another user.
     */
    @Transactional(readOnly = true)
    public RelationStatus relationStatus(Long userId, Long otherId) {
        Optional<Friendship> outgoing = friendshipRepository.findByRequesterIdAndAddresseeId(userId, otherId);
        Optional<Friendship> incoming = friendshipRepository.findByRequesterIdAndAddresseeId(otherId, userId);

        if (isAccepted(outgoing) || isAccepted(incoming)) {
            return RelationStatus.FRIENDS;
        }
        if (outgoing.isPresent()) {
            return RelationStatus.OUTGOING;
        }
        if (incoming.isPresent()) {
            return RelationStatus.INCOMING;
        }
        return RelationStatus.NONE;
    }

    /**
     * Resolves user ids to their public summaries. Every user in {@code ids} has
     * the same relationship to the viewer (everyone in the friends list is a
     * friend, everyone in incoming requests sent one), so the relation is passed
     * in rather than looked up per row.
     */
    private List<UserSummaryResponse> toSummaries(List<Long> ids, RelationStatus relation) {
        if (ids.isEmpty()) {
            return List.of();
        }

        return userRepository.findAllById(ids).stream()
                .map(user -> new UserSummaryResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getAvatarIcon(),
                        user.getEquippedBadge(),
                        relation.name()))
                .toList();
    }

    private Friendship pendingIncoming(Long userId, Long requesterId) {
        return friendshipRepository.findByRequesterIdAndAddresseeId(requesterId, userId)
                .filter(FriendshipService::isPending)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.FRIEND_REQUEST_NOT_FOUND));
    }

    private void accept(Friendship friendship) {
        friendship.setStatus(Friendship.STATUS_ACCEPTED);
        friendship.setRespondedAt(System.currentTimeMillis());
        friendshipRepository.save(friendship);
    }

    private static Long otherSide(Friendship friendship, Long userId) {
        return friendship.getRequesterId().equals(userId)
                ? friendship.getAddresseeId()
                : friendship.getRequesterId();
    }

    private static boolean isPending(Friendship friendship) {
        return Friendship.STATUS_PENDING.equals(friendship.getStatus());
    }

    private static boolean isAccepted(Optional<Friendship> friendship) {
        return friendship.map(f -> Friendship.STATUS_ACCEPTED.equals(f.getStatus())).orElse(false);
    }
}
