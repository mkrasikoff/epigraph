package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.friend.FriendProfileResponse;
import com.mkrasikoff.epigraph.dto.friend.UserSummaryResponse;
import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.service.FriendshipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FriendControllerTest {

    @Mock
    private FriendshipService friendshipService;

    private MockMvc mockMvc;

    private static final Long OTHER = 2L;

    @BeforeEach
    void setUp() {
        FriendController controller = new FriendController(friendshipService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/friends: returns the caller's friends")
    void listFriends_returnsFriends() throws Exception {
        when(friendshipService.listFriends(null))
                .thenReturn(List.of(new UserSummaryResponse(OTHER, "anna", "cat", "collector", "FRIENDS")));

        mockMvc.perform(get("/api/friends"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].username").value("anna"))
                .andExpect(jsonPath("$[0].relation").value("FRIENDS"))
                .andExpect(jsonPath("$[0].email").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/friends/requests: returns incoming requests")
    void listIncomingRequests_returnsRequests() throws Exception {
        when(friendshipService.listIncomingRequests(null))
                .thenReturn(List.of(new UserSummaryResponse(OTHER, "anna", "cat", null, "INCOMING")));

        mockMvc.perform(get("/api/friends/requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].relation").value("INCOMING"));
    }

    @Test
    @DisplayName("GET /api/friends/requests/outgoing: returns requests the caller sent")
    void listOutgoingRequests_returnsRequests() throws Exception {
        when(friendshipService.listOutgoingRequests(null))
                .thenReturn(List.of(new UserSummaryResponse(OTHER, "anna", "cat", null, "OUTGOING")));

        mockMvc.perform(get("/api/friends/requests/outgoing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].relation").value("OUTGOING"));
    }

    @Test
    @DisplayName("GET /api/friends/search: returns matches with the viewer's relation")
    void search_returnsMatches() throws Exception {
        when(friendshipService.searchUsers(null, "an"))
                .thenReturn(List.of(new UserSummaryResponse(OTHER, "anna", "cat", null, "NONE")));

        mockMvc.perform(get("/api/friends/search").param("q", "an"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("anna"))
                .andExpect(jsonPath("$[0].relation").value("NONE"));
    }

    @Test
    @DisplayName("GET /api/friends/search: passes a missing q through as null")
    void search_withoutQueryParam() throws Exception {
        when(friendshipService.searchUsers(null, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/friends/search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @DisplayName("GET /api/friends/{id}/profile: returns the public profile")
    void profile_returnsProfile() throws Exception {
        when(friendshipService.getProfile(null, OTHER)).thenReturn(new FriendProfileResponse(
                OTHER, "anna", "cat", "collector", "cosmos", true,
                1600000000000L, 18, 63L, List.of("explorer"), "FRIENDS"));

        mockMvc.perform(get("/api/friends/2/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("anna"))
                .andExpect(jsonPath("$.themeStyle").value("cosmos"))
                .andExpect(jsonPath("$.plus").value(true))
                .andExpect(jsonPath("$.currentStreak").value(18))
                .andExpect(jsonPath("$.quoteCount").value(63))
                .andExpect(jsonPath("$.unlockedAchievements[0]").value("explorer"))
                .andExpect(jsonPath("$.relation").value("FRIENDS"))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/friends/{id}/profile: returns 400 for an unknown user")
    void profile_returnsBadRequest_whenUserMissing() throws Exception {
        when(friendshipService.getProfile(null, OTHER))
                .thenThrow(new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        mockMvc.perform(get("/api/friends/2/profile"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ApiCodes.USER_NOT_FOUND));
    }

    @Test
    @DisplayName("POST /api/friends/requests/{id}: returns 200 on success")
    void sendRequest_returnsOk() throws Exception {
        doNothing().when(friendshipService).sendRequest(isNull(), eq(OTHER));

        mockMvc.perform(post("/api/friends/requests/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIEND_REQUEST_SENT));

        verify(friendshipService).sendRequest(isNull(), eq(OTHER));
    }

    @Test
    @DisplayName("POST /api/friends/requests/{id}: returns 400 with the service's code")
    void sendRequest_returnsBadRequest_whenServiceThrows() throws Exception {
        doThrow(new IllegalArgumentException(ApiCodes.ALREADY_FRIENDS))
                .when(friendshipService).sendRequest(isNull(), eq(OTHER));

        mockMvc.perform(post("/api/friends/requests/2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ApiCodes.ALREADY_FRIENDS));
    }

    @Test
    @DisplayName("POST /api/friends/requests/{id}/accept: returns 200 on success")
    void acceptRequest_returnsOk() throws Exception {
        doNothing().when(friendshipService).acceptRequest(isNull(), eq(OTHER));

        mockMvc.perform(post("/api/friends/requests/2/accept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIEND_REQUEST_ACCEPTED));

        verify(friendshipService).acceptRequest(isNull(), eq(OTHER));
    }

    @Test
    @DisplayName("POST /api/friends/requests/{id}/accept: returns 400 when there is no such request")
    void acceptRequest_returnsBadRequest_whenServiceThrows() throws Exception {
        doThrow(new IllegalArgumentException(ApiCodes.FRIEND_REQUEST_NOT_FOUND))
                .when(friendshipService).acceptRequest(isNull(), eq(OTHER));

        mockMvc.perform(post("/api/friends/requests/2/accept"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIEND_REQUEST_NOT_FOUND));
    }

    @Test
    @DisplayName("DELETE /api/friends/requests/{id}: declines the request")
    void declineRequest_returnsOk() throws Exception {
        doNothing().when(friendshipService).declineRequest(isNull(), eq(OTHER));

        mockMvc.perform(delete("/api/friends/requests/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIEND_REQUEST_DECLINED));

        verify(friendshipService).declineRequest(isNull(), eq(OTHER));
    }

    @Test
    @DisplayName("DELETE /api/friends/{id}: removes the friendship")
    void removeFriend_returnsOk() throws Exception {
        doNothing().when(friendshipService).removeFriend(isNull(), eq(OTHER));

        mockMvc.perform(delete("/api/friends/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIEND_REMOVED));

        verify(friendshipService).removeFriend(isNull(), eq(OTHER));
    }

    @Test
    @DisplayName("DELETE /api/friends/{id}: returns 400 when there is no relationship")
    void removeFriend_returnsBadRequest_whenServiceThrows() throws Exception {
        doThrow(new IllegalArgumentException(ApiCodes.FRIENDSHIP_NOT_FOUND))
                .when(friendshipService).removeFriend(isNull(), eq(OTHER));

        mockMvc.perform(delete("/api/friends/2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(ApiCodes.FRIENDSHIP_NOT_FOUND));
    }
}
