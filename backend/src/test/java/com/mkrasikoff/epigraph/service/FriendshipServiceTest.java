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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock
    private FriendshipRepository friendshipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private AchievementService achievementService;

    @InjectMocks
    private FriendshipService friendshipService;

    private static final Long ME = 1L;
    private static final Long OTHER = 2L;

    private Friendship pending(Long requesterId, Long addresseeId) {
        Friendship f = new Friendship();
        f.setRequesterId(requesterId);
        f.setAddresseeId(addresseeId);
        f.setStatus(Friendship.STATUS_PENDING);
        f.setCreatedAt(1000L);
        return f;
    }

    private User user(Long id, String username) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        return u;
    }

    private Friendship accepted(Long requesterId, Long addresseeId) {
        Friendship f = pending(requesterId, addresseeId);
        f.setStatus(Friendship.STATUS_ACCEPTED);
        f.setRespondedAt(2000L);
        return f;
    }

    @Test
    @DisplayName("sendRequest: saves a new PENDING row when no prior relationship exists")
    void sendRequest_createsPendingRequest() {
        when(userRepository.existsById(OTHER)).thenReturn(true);
        when(friendshipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        friendshipService.sendRequest(ME, OTHER);

        ArgumentCaptor<Friendship> captor = ArgumentCaptor.forClass(Friendship.class);
        verify(friendshipRepository).save(captor.capture());
        Friendship saved = captor.getValue();
        assertThat(saved.getRequesterId()).isEqualTo(ME);
        assertThat(saved.getAddresseeId()).isEqualTo(OTHER);
        assertThat(saved.getStatus()).isEqualTo(Friendship.STATUS_PENDING);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getRespondedAt()).isNull();
    }

    @Test
    @DisplayName("sendRequest: throws when addressing yourself")
    void sendRequest_throwsWhenSelf() {
        assertThatThrownBy(() -> friendshipService.sendRequest(ME, ME))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.CANNOT_FRIEND_SELF);

        verify(friendshipRepository, never()).save(any());
    }

    @Test
    @DisplayName("sendRequest: throws when the addressee does not exist")
    void sendRequest_throwsWhenAddresseeMissing() {
        when(userRepository.existsById(OTHER)).thenReturn(false);

        assertThatThrownBy(() -> friendshipService.sendRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("sendRequest: throws when already friends")
    void sendRequest_throwsWhenAlreadyFriends() {
        when(userRepository.existsById(OTHER)).thenReturn(true);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.of(accepted(ME, OTHER)));

        assertThatThrownBy(() -> friendshipService.sendRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.ALREADY_FRIENDS);

        verify(friendshipRepository, never()).save(any());
    }

    @Test
    @DisplayName("sendRequest: throws when a request is already pending")
    void sendRequest_throwsWhenRequestAlreadySent() {
        when(userRepository.existsById(OTHER)).thenReturn(true);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.of(pending(ME, OTHER)));

        assertThatThrownBy(() -> friendshipService.sendRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.REQUEST_ALREADY_SENT);

        verify(friendshipRepository, never()).save(any());
    }

    @Test
    @DisplayName("sendRequest: a mutual pending request collapses into an accepted friendship")
    void sendRequest_collapsesMutualIncomingIntoAcceptance() {
        Friendship incoming = pending(OTHER, ME);
        when(userRepository.existsById(OTHER)).thenReturn(true);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.empty());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(incoming));
        when(friendshipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        friendshipService.sendRequest(ME, OTHER);

        ArgumentCaptor<Friendship> captor = ArgumentCaptor.forClass(Friendship.class);
        verify(friendshipRepository).save(captor.capture());
        Friendship saved = captor.getValue();
        assertThat(saved).isSameAs(incoming);
        assertThat(saved.getStatus()).isEqualTo(Friendship.STATUS_ACCEPTED);
        assertThat(saved.getRespondedAt()).isNotNull();
    }

    @Test
    @DisplayName("acceptRequest: flips the incoming pending request to ACCEPTED")
    void acceptRequest_setsAccepted() {
        Friendship incoming = pending(OTHER, ME);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(incoming));
        when(friendshipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        friendshipService.acceptRequest(ME, OTHER);

        assertThat(incoming.getStatus()).isEqualTo(Friendship.STATUS_ACCEPTED);
        assertThat(incoming.getRespondedAt()).isNotNull();
        verify(friendshipRepository).save(incoming);
    }

    @Test
    @DisplayName("acceptRequest: throws when there is no pending incoming request")
    void acceptRequest_throwsWhenNoPendingRequest() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> friendshipService.acceptRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.FRIEND_REQUEST_NOT_FOUND);

        verify(friendshipRepository, never()).save(any());
    }

    @Test
    @DisplayName("acceptRequest: throws when the only row is already accepted (not pending)")
    void acceptRequest_throwsWhenAlreadyAccepted() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(accepted(OTHER, ME)));

        assertThatThrownBy(() -> friendshipService.acceptRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.FRIEND_REQUEST_NOT_FOUND);
    }

    @Test
    @DisplayName("declineRequest: deletes the incoming pending request")
    void declineRequest_deletesIncomingPending() {
        Friendship incoming = pending(OTHER, ME);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(incoming));

        friendshipService.declineRequest(ME, OTHER);

        verify(friendshipRepository).delete(incoming);
    }

    @Test
    @DisplayName("declineRequest: throws when there is no pending incoming request")
    void declineRequest_throwsWhenNoPendingRequest() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> friendshipService.declineRequest(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.FRIEND_REQUEST_NOT_FOUND);

        verify(friendshipRepository, never()).delete(any());
    }

    @Test
    @DisplayName("removeFriend: deletes the relationship when the user is the requester side")
    void removeFriend_deletesRelationship_requesterSide() {
        Friendship friendship = accepted(ME, OTHER);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.of(friendship));

        friendshipService.removeFriend(ME, OTHER);

        verify(friendshipRepository).delete(friendship);
    }

    @Test
    @DisplayName("removeFriend: deletes the relationship when the user is the addressee side")
    void removeFriend_deletesRelationship_addresseeSide() {
        Friendship friendship = accepted(OTHER, ME);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.empty());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(friendship));

        friendshipService.removeFriend(ME, OTHER);

        verify(friendshipRepository).delete(friendship);
    }

    @Test
    @DisplayName("removeFriend: throws when there is no relationship in either direction")
    void removeFriend_throwsWhenNoRelationship() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.empty());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> friendshipService.removeFriend(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.FRIENDSHIP_NOT_FOUND);

        verify(friendshipRepository, never()).delete(any());
    }

    @Test
    @DisplayName("relationStatus: FRIENDS when an accepted row exists in either direction")
    void relationStatus_friends() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.of(accepted(ME, OTHER)));

        assertThat(friendshipService.relationStatus(ME, OTHER)).isEqualTo(FriendshipService.RelationStatus.FRIENDS);
    }

    @Test
    @DisplayName("relationStatus: OUTGOING when the user has a pending request out")
    void relationStatus_outgoing() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.of(pending(ME, OTHER)));

        assertThat(friendshipService.relationStatus(ME, OTHER)).isEqualTo(FriendshipService.RelationStatus.OUTGOING);
    }

    @Test
    @DisplayName("relationStatus: INCOMING when the other user has a pending request out")
    void relationStatus_incoming() {
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER)).thenReturn(Optional.empty());
        when(friendshipRepository.findByRequesterIdAndAddresseeId(OTHER, ME)).thenReturn(Optional.of(pending(OTHER, ME)));

        assertThat(friendshipService.relationStatus(ME, OTHER)).isEqualTo(FriendshipService.RelationStatus.INCOMING);
    }

    @Test
    @DisplayName("relationStatus: NONE when there is no relationship")
    void relationStatus_none() {
        assertThat(friendshipService.relationStatus(ME, OTHER)).isEqualTo(FriendshipService.RelationStatus.NONE);
    }

    @Test
    @DisplayName("listFriends: resolves the other side of each accepted row, marked FRIENDS")
    void listFriends_mapsOtherSideToSummaries() {
        when(friendshipRepository.findAcceptedForUser(ME))
                .thenReturn(List.of(accepted(ME, 2L), accepted(3L, ME)));
        when(userRepository.findAllById(List.of(2L, 3L)))
                .thenReturn(List.of(user(2L, "anna"), user(3L, "boris")));

        List<UserSummaryResponse> result = friendshipService.listFriends(ME);

        assertThat(result).extracting(UserSummaryResponse::getId).containsExactly(2L, 3L);
        assertThat(result).extracting(UserSummaryResponse::getUsername).containsExactly("anna", "boris");
        assertThat(result).extracting(UserSummaryResponse::getRelation)
                .containsOnly(FriendshipService.RelationStatus.FRIENDS.name());
    }

    @Test
    @DisplayName("listIncomingRequests: resolves each pending requester, marked INCOMING")
    void listIncomingRequests_mapsRequesterToSummaries() {
        when(friendshipRepository.findByAddresseeIdAndStatus(ME, Friendship.STATUS_PENDING))
                .thenReturn(List.of(pending(2L, ME)));
        when(userRepository.findAllById(List.of(2L))).thenReturn(List.of(user(2L, "anna")));

        List<UserSummaryResponse> result = friendshipService.listIncomingRequests(ME);

        assertThat(result).extracting(UserSummaryResponse::getId).containsExactly(2L);
        assertThat(result).extracting(UserSummaryResponse::getRelation)
                .containsOnly(FriendshipService.RelationStatus.INCOMING.name());
    }

    @Test
    @DisplayName("listFriends: returns empty without hitting the user repository")
    void listFriends_returnsEmptyWhenNoFriends() {
        when(friendshipRepository.findAcceptedForUser(ME)).thenReturn(List.of());

        assertThat(friendshipService.listFriends(ME)).isEmpty();
        verify(userRepository, never()).findAllById(any());
    }

    @Test
    @DisplayName("listFriends: never exposes the friend's email")
    void listFriends_summaryHasNoEmailField() {
        assertThat(UserSummaryResponse.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("email");
    }

    @Test
    @DisplayName("searchUsers: returns matches carrying the viewer's relation to each")
    void searchUsers_returnsMatchesWithRelation() {
        when(userRepository.findTop20ByUsernameContainingIgnoreCaseAndIdNot("an", ME))
                .thenReturn(List.of(user(OTHER, "anna")));
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER))
                .thenReturn(Optional.of(pending(ME, OTHER)));

        List<UserSummaryResponse> result = friendshipService.searchUsers(ME, "an");

        assertThat(result).extracting(UserSummaryResponse::getId).containsExactly(OTHER);
        assertThat(result).extracting(UserSummaryResponse::getRelation)
                .containsExactly(FriendshipService.RelationStatus.OUTGOING.name());
    }

    @Test
    @DisplayName("searchUsers: trims the query before measuring it")
    void searchUsers_trimsQuery() {
        when(userRepository.findTop20ByUsernameContainingIgnoreCaseAndIdNot("an", ME))
                .thenReturn(List.of(user(OTHER, "anna")));

        assertThat(friendshipService.searchUsers(ME, "  an  ")).hasSize(1);
    }

    @Test
    @DisplayName("searchUsers: returns empty for a too-short, blank, or null query")
    void searchUsers_returnsEmptyForShortQuery() {
        assertThat(friendshipService.searchUsers(ME, "a")).isEmpty();
        assertThat(friendshipService.searchUsers(ME, "   ")).isEmpty();
        assertThat(friendshipService.searchUsers(ME, null)).isEmpty();

        verify(userRepository, never()).findTop20ByUsernameContainingIgnoreCaseAndIdNot(any(), any());
    }

    @Test
    @DisplayName("getProfile: assembles public fields, streak, quote count and unlocked achievements")
    void getProfile_assemblesPublicProfile() {
        User target = user(OTHER, "anna");
        target.setAvatarIcon("cat");
        target.setEquippedBadge("collector");
        target.setThemeStyle("cosmos");
        target.setPlusSince(1700000000000L);
        target.setCreatedAt(1600000000000L);

        when(userRepository.findById(OTHER)).thenReturn(Optional.of(target));
        when(achievementService.getStatusForUser(OTHER)).thenReturn(List.of(
                new AchievementStatusResponse("explorer", "action", 1, 1, true, 123L, "theme", "cosmos"),
                new AchievementStatusResponse("badge_sage", "days", 500, 10, false, null, "badge", "sage")));
        when(achievementService.currentStreak(OTHER)).thenReturn(18);
        when(quoteRepository.countByUserId(OTHER)).thenReturn(63L);
        when(friendshipRepository.findByRequesterIdAndAddresseeId(ME, OTHER))
                .thenReturn(Optional.of(accepted(ME, OTHER)));

        FriendProfileResponse profile = friendshipService.getProfile(ME, OTHER);

        assertThat(profile.getId()).isEqualTo(OTHER);
        assertThat(profile.getUsername()).isEqualTo("anna");
        assertThat(profile.getAvatarIcon()).isEqualTo("cat");
        assertThat(profile.getEquippedBadge()).isEqualTo("collector");
        assertThat(profile.getThemeStyle()).isEqualTo("cosmos");
        assertThat(profile.isPlus()).isTrue();
        assertThat(profile.getMemberSince()).isEqualTo(1600000000000L);
        assertThat(profile.getCurrentStreak()).isEqualTo(18);
        assertThat(profile.getQuoteCount()).isEqualTo(63L);
        assertThat(profile.getUnlockedAchievements()).containsExactly("explorer");
        assertThat(profile.getRelation()).isEqualTo(FriendshipService.RelationStatus.FRIENDS.name());
    }

    @Test
    @DisplayName("getProfile: plus is false when the account never redeemed a code")
    void getProfile_plusFalseWithoutPlusSince() {
        User target = user(OTHER, "anna");
        when(userRepository.findById(OTHER)).thenReturn(Optional.of(target));
        when(achievementService.getStatusForUser(OTHER)).thenReturn(List.of());

        assertThat(friendshipService.getProfile(ME, OTHER).isPlus()).isFalse();
    }

    @Test
    @DisplayName("getProfile: throws when the user does not exist")
    void getProfile_throwsWhenUserMissing() {
        when(userRepository.findById(OTHER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> friendshipService.getProfile(ME, OTHER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("getProfile: never exposes email or quotes")
    void getProfile_hasNoEmailOrQuotesField() {
        assertThat(FriendProfileResponse.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("email", "quotes");
    }
}
