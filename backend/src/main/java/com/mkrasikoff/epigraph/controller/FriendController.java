package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.common.ErrorResponse;
import com.mkrasikoff.epigraph.dto.friend.FriendQuoteResponse;
import com.mkrasikoff.epigraph.dto.friend.UserSummaryResponse;
import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.service.FriendshipService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Friends with mutual confirmation (TASK-129). Every endpoint acts on behalf of
 * the authenticated caller — the target user is only ever a path variable, so
 * one user can never accept, decline, or remove somebody else's friendship
 * (the service re-checks this too).
 */
@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private static final Logger log = LoggerFactory.getLogger(FriendController.class);

    private final FriendshipService friendshipService;

    public FriendController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    /**
     * The caller's accepted friends.
     */
    @GetMapping
    public List<UserSummaryResponse> listFriends(@AuthenticationPrincipal Long userId) {
        return friendshipService.listFriends(userId);
    }

    /**
     * Friend requests awaiting the caller's answer.
     */
    @GetMapping("/requests")
    public List<UserSummaryResponse> listIncomingRequests(@AuthenticationPrincipal Long userId) {
        return friendshipService.listIncomingRequests(userId);
    }

    /**
     * Requests the caller has sent and that are still unanswered.
     */
    @GetMapping("/requests/outgoing")
    public List<UserSummaryResponse> listOutgoingRequests(@AuthenticationPrincipal Long userId) {
        return friendshipService.listOutgoingRequests(userId);
    }

    /**
     * Finds users to befriend by display name. Returns nothing for a query
     * shorter than the service's minimum rather than most of the user base.
     */
    @GetMapping("/search")
    public List<UserSummaryResponse> search(@AuthenticationPrincipal Long userId,
                                            @RequestParam(name = "q", required = false) String query) {
        return friendshipService.searchUsers(userId, query);
    }

    /**
     * Another user's public profile. Readable by any signed-in user — it is how
     * you decide whether to send a request — and carries no quotes.
     */
    @GetMapping("/{targetId}/profile")
    public ResponseEntity<?> profile(@AuthenticationPrincipal Long userId, @PathVariable Long targetId) {
        try {
            return ResponseEntity.ok(friendshipService.getProfile(userId, targetId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * A friend's quotes. 403 only when the caller is not an accepted friend —
     * defence in depth, since the client learns the relation from the profile
     * and normally doesn't ask. A friend whose owner shares nothing, or who has
     * nothing matching the setting, gets an empty list.
     */
    @GetMapping("/{targetId}/quotes")
    public List<FriendQuoteResponse> quotes(@AuthenticationPrincipal Long userId, @PathVariable Long targetId) {
        return friendshipService.listFriendQuotes(userId, targetId);
    }

    /**
     * Sends a friend request to the given user. If that user had already sent
     * the caller a request, the two collapse into an accepted friendship.
     */
    @PostMapping("/requests/{addresseeId}")
    public ResponseEntity<?> sendRequest(@AuthenticationPrincipal Long userId, @PathVariable Long addresseeId) {
        try {
            friendshipService.sendRequest(userId, addresseeId);
            log.info("Friend request sent — from userId = {} to userId = {}", userId, addresseeId);

            return ResponseEntity.ok(new ErrorResponse(ApiCodes.FRIEND_REQUEST_SENT));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Accepts a pending request the caller received from the given user.
     */
    @PostMapping("/requests/{requesterId}/accept")
    public ResponseEntity<?> acceptRequest(@AuthenticationPrincipal Long userId, @PathVariable Long requesterId) {
        try {
            friendshipService.acceptRequest(userId, requesterId);
            log.info("Friend request accepted — userId = {} accepted userId = {}", userId, requesterId);

            return ResponseEntity.ok(new ErrorResponse(ApiCodes.FRIEND_REQUEST_ACCEPTED));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Declines a pending request the caller received from the given user.
     */
    @DeleteMapping("/requests/{requesterId}")
    public ResponseEntity<?> declineRequest(@AuthenticationPrincipal Long userId, @PathVariable Long requesterId) {
        try {
            friendshipService.declineRequest(userId, requesterId);
            log.info("Friend request declined — userId = {} declined userId = {}", userId, requesterId);

            return ResponseEntity.ok(new ErrorResponse(ApiCodes.FRIEND_REQUEST_DECLINED));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Removes a friend, or cancels the caller's own still-pending request to them.
     */
    @DeleteMapping("/{otherId}")
    public ResponseEntity<?> removeFriend(@AuthenticationPrincipal Long userId, @PathVariable Long otherId) {
        try {
            friendshipService.removeFriend(userId, otherId);
            log.info("Friendship removed — userId = {} removed userId = {}", userId, otherId);

            return ResponseEntity.ok(new ErrorResponse(ApiCodes.FRIEND_REMOVED));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
}
