package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.auth.AuthRequest;
import com.mkrasikoff.epigraph.exception.EmailNotVerifiedException;
import com.mkrasikoff.epigraph.dto.auth.RegisterRequest;
import com.mkrasikoff.epigraph.dto.auth.VerifyRequest;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.AuthService;
import com.mkrasikoff.epigraph.service.FriendshipService;
import com.mkrasikoff.epigraph.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private UserService userService;

    @Mock
    private AchievementService achievementService;

    @Mock
    private FriendshipService friendshipService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(authService, userService, achievementService, friendshipService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/auth/register: returns 202 on valid request")
    void register_returnsAccepted() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@example.com");
        request.setPassword("password1");

        doNothing().when(authService).register(eq("user@example.com"), anyString(), isNull());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        verify(authService).register(eq("user@example.com"), anyString(), isNull());
    }

    @Test
    @DisplayName("POST /api/auth/register: returns 400 on invalid email")
    void register_returnsBadRequest_whenEmailInvalid() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("not-an-email");
        request.setPassword("password1");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/register: returns 400 when password too short")
    void register_returnsBadRequest_whenPasswordTooShort() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@example.com");
        request.setPassword("abc");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/register: returns 400 when password has no digits")
    void register_returnsBadRequest_whenPasswordNoDigits() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@example.com");
        request.setPassword("onlyletters");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/verify: returns 201 with token on valid code")
    void verify_returnsCreatedWithToken() throws Exception {
        VerifyRequest request = new VerifyRequest();
        request.setEmail("user@example.com");
        request.setCode("123456");

        when(authService.verify("user@example.com", "123456", null)).thenReturn("jwt-token");

        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.token").value("jwt-token"));

        verify(authService).verify("user@example.com", "123456", null);
    }

    @Test
    @DisplayName("POST /api/auth/verify: returns 400 on wrong code")
    void verify_returnsBadRequest_whenCodeInvalid() throws Exception {
        VerifyRequest request = new VerifyRequest();
        request.setEmail("user@example.com");
        request.setCode("000000");

        when(authService.verify("user@example.com", "000000", null))
                .thenThrow(new IllegalArgumentException("INVALID_OR_EXPIRED_CODE"));

        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("INVALID_OR_EXPIRED_CODE"));

        verify(authService).verify("user@example.com", "000000", null);
    }

    @Test
    @DisplayName("POST /api/auth/verify: returns 400 when code format invalid")
    void verify_returnsBadRequest_whenCodeNotSixDigits() throws Exception {
        VerifyRequest request = new VerifyRequest();
        request.setEmail("user@example.com");
        request.setCode("abc");

        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/resend: returns 202 on valid email")
    void resend_returnsAccepted() throws Exception {
        doNothing().when(authService).resendCode("user@example.com", null);

        mockMvc.perform(post("/api/auth/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\"}"))
                .andExpect(status().isAccepted());

        verify(authService).resendCode("user@example.com", null);
    }

    @Test
    @DisplayName("POST /api/auth/resend: returns 202 and skips service call when email blank")
    void resend_returnsAccepted_whenEmailBlank() throws Exception {
        mockMvc.perform(post("/api/auth/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\"}"))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("POST /api/auth/login: returns 200 with token on valid credentials")
    void login_returnsOkWithToken() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setEmail("user@example.com");
        request.setPassword("password1");

        when(authService.login("user@example.com", "password1")).thenReturn("jwt-token");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.token").value("jwt-token"));

        verify(authService).login("user@example.com", "password1");
    }

    @Test
    @DisplayName("POST /api/auth/login: returns 401 when credentials wrong")
    void login_returnsUnauthorized_whenCredentialsInvalid() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrongpass1");

        when(authService.login("user@example.com", "wrongpass1")).thenReturn(null);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("INVALID_CREDENTIALS"));

        verify(authService).login("user@example.com", "wrongpass1");
    }

    @Test
    @DisplayName("POST /api/auth/login: returns 403 EMAIL_NOT_VERIFIED when the account isn't verified")
    void login_returnsForbidden_whenEmailNotVerified() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setEmail("user@example.com");
        request.setPassword("password1");

        when(authService.login("user@example.com", "password1"))
                .thenThrow(new EmailNotVerifiedException("user@example.com"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("EMAIL_NOT_VERIFIED"));

        verify(authService).login("user@example.com", "password1");
    }

    @Test
    @DisplayName("POST /api/auth/login: returns 400 on invalid email format")
    void login_returnsBadRequest_whenEmailInvalid() throws Exception {
        AuthRequest request = new AuthRequest();
        request.setEmail("bad-email");
        request.setPassword("password1");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password: returns 202 on valid email")
    void forgotPassword_returnsAccepted() throws Exception {
        doNothing().when(userService).initiatePasswordReset("user@example.com", null);

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\"}"))
                .andExpect(status().isAccepted());

        verify(userService).initiatePasswordReset("user@example.com", null);
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password: returns 202 and skips service call when email blank")
    void forgotPassword_returnsAccepted_whenEmailBlank() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\"}"))
                .andExpect(status().isAccepted());
    }

    @Test
    @DisplayName("GET /api/auth/me: returns 200 with profile when user found")
    void me_returnsOkWithProfile() throws Exception {
        User user = new User();
        user.setId(42L);
        user.setEmail("user@example.com");
        user.setUsername("testuser");
        user.setAvatarIcon("cat");
        user.setPreferredLanguage("en");
        user.setThemeStyle("forest");
        user.setEquippedBadge("chronicler");
        user.setPlusSince(1_700_000_000_000L);
        when(userService.findById(null)).thenReturn(Optional.of(user));
        when(friendshipService.countIncomingRequests(null)).thenReturn(2);
        when(achievementService.currentStreak(null)).thenReturn(6);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.pendingFriendRequests").value(2))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.avatarIcon").value("cat"))
                .andExpect(jsonPath("$.preferredLanguage").value("en"))
                .andExpect(jsonPath("$.themeStyle").value("forest"))
                .andExpect(jsonPath("$.equippedBadge").value("chronicler"))
                .andExpect(jsonPath("$.plus").value(true))
                .andExpect(jsonPath("$.currentStreak").value(6));
    }

    @Test
    @DisplayName("GET /api/auth/me: re-evaluates achievements when today is a new activity day (TASK-124)")
    void me_evaluatesAchievements_onNewActivityDay() throws Exception {
        User user = new User();
        user.setId(42L);
        user.setEmail("user@example.com");
        when(userService.findById(null)).thenReturn(Optional.of(user));
        when(achievementService.markActiveToday(null)).thenReturn(true);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk());

        verify(achievementService).markActiveToday(null);
        verify(achievementService).evaluate(null);
        verify(userService, org.mockito.Mockito.times(2)).findById(null);
    }

    @Test
    @DisplayName("GET /api/auth/me: skips evaluate() when today was already recorded (TASK-124)")
    void me_skipsEvaluate_whenNotANewActivityDay() throws Exception {
        User user = new User();
        user.setId(42L);
        user.setEmail("user@example.com");
        when(userService.findById(null)).thenReturn(Optional.of(user));
        when(achievementService.markActiveToday(null)).thenReturn(false);

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk());

        verify(achievementService).markActiveToday(null);
        verify(achievementService, org.mockito.Mockito.never()).evaluate(null);
        verify(userService, org.mockito.Mockito.times(1)).findById(null);
    }

    @Test
    @DisplayName("GET /api/auth/me: returns 404 when user not found")
    void me_returnsNotFound_whenUserMissing() throws Exception {
        when(userService.findById(null)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("USER_NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/auth/me: returns null username when not set")
    void me_returnsNullUsername_whenNotSet() throws Exception {
        User user = new User();
        user.setId(7L);
        user.setEmail("nouser@example.com");
        when(userService.findById(null)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.email").value("nouser@example.com"))
                .andExpect(jsonPath("$.username").doesNotExist())
                .andExpect(jsonPath("$.avatarIcon").value("neutral"))
                .andExpect(jsonPath("$.preferredLanguage").value("ru"))
                .andExpect(jsonPath("$.themeStyle").value("classic"))
                .andExpect(jsonPath("$.equippedBadge").doesNotExist())
                .andExpect(jsonPath("$.plus").value(false));
    }
}
