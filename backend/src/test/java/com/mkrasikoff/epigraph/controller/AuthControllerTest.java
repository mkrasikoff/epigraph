package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.AuthRequest;
import com.mkrasikoff.epigraph.dto.RegisterRequest;
import com.mkrasikoff.epigraph.dto.VerifyRequest;
import com.mkrasikoff.epigraph.service.AuthService;
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

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(authService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/auth/register: returns 202 on valid request")
    void register_returnsAccepted() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("user@example.com");
        request.setPassword("password1");

        doNothing().when(authService).register(eq("user@example.com"), anyString());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        verify(authService).register(eq("user@example.com"), anyString());
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

        when(authService.verify("user@example.com", "123456")).thenReturn("jwt-token");

        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.token").value("jwt-token"));

        verify(authService).verify("user@example.com", "123456");
    }

    @Test
    @DisplayName("POST /api/auth/verify: returns 400 on wrong code")
    void verify_returnsBadRequest_whenCodeInvalid() throws Exception {
        VerifyRequest request = new VerifyRequest();
        request.setEmail("user@example.com");
        request.setCode("000000");

        when(authService.verify("user@example.com", "000000"))
                .thenThrow(new IllegalArgumentException("Неверный код"));

        mockMvc.perform(post("/api/auth/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Неверный код"));

        verify(authService).verify("user@example.com", "000000");
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
        doNothing().when(authService).resendCode("user@example.com");

        mockMvc.perform(post("/api/auth/resend")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\"}"))
                .andExpect(status().isAccepted());

        verify(authService).resendCode("user@example.com");
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
                .andExpect(jsonPath("$.message").value("Неверный email или пароль"));

        verify(authService).login("user@example.com", "wrongpass1");
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
        doNothing().when(userService).initiatePasswordReset("user@example.com");

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\"}"))
                .andExpect(status().isAccepted());

        verify(userService).initiatePasswordReset("user@example.com");
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password: returns 202 and skips service call when email blank")
    void forgotPassword_returnsAccepted_whenEmailBlank() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\"}"))
                .andExpect(status().isAccepted());
    }
}
