package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.ChangePasswordRequest;
import com.mkrasikoff.epigraph.dto.UpdateUsernameRequest;
import com.mkrasikoff.epigraph.service.JwtService;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private JwtService jwtService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(userService, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("DELETE /api/user/me: returns 204 on success")
    void deleteAccount_returnsNoContent() throws Exception {
        doNothing().when(userService).deleteAccount(null);

        mockMvc.perform(delete("/api/user/me"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(userService).deleteAccount(null);
    }

    @Test
    @DisplayName("PATCH /api/user/me/password: returns 200 on success")
    void changePassword_returnsOk() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("newPass1234");
        doNothing().when(userService).changePassword(isNull(), eq("newPass1234"));

        mockMvc.perform(patch("/api/user/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Пароль успешно изменён"));

        verify(userService).changePassword(isNull(), eq("newPass1234"));
    }

    @Test
    @DisplayName("PATCH /api/user/me/password: returns 400 when service throws")
    void changePassword_returnsBadRequest_whenServiceThrows() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("newPass1234");
        doThrow(new IllegalArgumentException("Новый пароль совпадает с текущим"))
                .when(userService).changePassword(isNull(), eq("newPass1234"));

        mockMvc.perform(patch("/api/user/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Новый пароль совпадает с текущим"));

        verify(userService).changePassword(isNull(), eq("newPass1234"));
    }

    @Test
    @DisplayName("PATCH /api/user/me/password: returns 400 when password too short")
    void changePassword_returnsBadRequest_whenPasswordTooShort() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("abc");

        mockMvc.perform(patch("/api/user/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/user/me/password: returns 400 when password blank")
    void changePassword_returnsBadRequest_whenPasswordBlank() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("");

        mockMvc.perform(patch("/api/user/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/user/reset-password: returns 200 with session token on success")
    void resetPassword_returnsOkWithToken() throws Exception {
        when(jwtService.isResetTokenValid("valid-reset-token")).thenReturn(true);
        when(jwtService.extractUserId("valid-reset-token")).thenReturn(42L);
        doNothing().when(userService).changePassword(42L, "newPass1234");
        when(userService.getEmailByUserId(42L)).thenReturn("user@example.com");
        when(jwtService.generateToken(42L, "user@example.com")).thenReturn("new-session-jwt");

        mockMvc.perform(patch("/api/user/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resetToken\":\"valid-reset-token\",\"newPassword\":\"newPass1234\"}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.token").value("new-session-jwt"));

        verify(jwtService).isResetTokenValid("valid-reset-token");
        verify(jwtService).extractUserId("valid-reset-token");
        verify(userService).changePassword(42L, "newPass1234");
        verify(jwtService).generateToken(42L, "user@example.com");
    }

    @Test
    @DisplayName("PATCH /api/user/reset-password: returns 400 when reset token invalid")
    void resetPassword_returnsBadRequest_whenTokenInvalid() throws Exception {
        when(jwtService.isResetTokenValid("expired-token")).thenReturn(false);

        mockMvc.perform(patch("/api/user/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resetToken\":\"expired-token\",\"newPassword\":\"newPass1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Ссылка недействительна или истекла"));

        verify(jwtService).isResetTokenValid("expired-token");
    }

    @Test
    @DisplayName("PATCH /api/user/reset-password: returns 400 when resetToken missing")
    void resetPassword_returnsBadRequest_whenTokenMissing() throws Exception {
        mockMvc.perform(patch("/api/user/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"newPass1234\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Некорректный запрос"));
    }

    @Test
    @DisplayName("PATCH /api/user/reset-password: returns 400 when newPassword missing")
    void resetPassword_returnsBadRequest_whenPasswordMissing() throws Exception {
        mockMvc.perform(patch("/api/user/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resetToken\":\"valid-reset-token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Некорректный запрос"));
    }

    @Test
    @DisplayName("PATCH /api/user/reset-password: returns 400 when changePassword throws")
    void resetPassword_returnsBadRequest_whenServiceThrows() throws Exception {
        when(jwtService.isResetTokenValid("valid-reset-token")).thenReturn(true);
        when(jwtService.extractUserId("valid-reset-token")).thenReturn(42L);
        doThrow(new IllegalArgumentException("Слабый пароль"))
                .when(userService).changePassword(42L, "weak");

        mockMvc.perform(patch("/api/user/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resetToken\":\"valid-reset-token\",\"newPassword\":\"weak\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Слабый пароль"));
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 200 on success")
    void updateUsername_returnsOk() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("newname");
        doNothing().when(userService).updateUsername(isNull(), eq("newname"));

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Имя пользователя обновлено"));

        verify(userService).updateUsername(isNull(), eq("newname"));
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 400 when service throws")
    void updateUsername_returnsBadRequest_whenServiceThrows() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("newname");
        doThrow(new IllegalArgumentException("Пользователь не найден"))
                .when(userService).updateUsername(isNull(), eq("newname"));

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Пользователь не найден"));
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 400 when username too short")
    void updateUsername_returnsBadRequest_whenTooShort() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("ab");

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 400 when username too long")
    void updateUsername_returnsBadRequest_whenTooLong() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("a".repeat(21));

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 400 when username has invalid characters")
    void updateUsername_returnsBadRequest_whenInvalidChars() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("bad name!");

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/user/me/username: returns 400 when username is blank")
    void updateUsername_returnsBadRequest_whenBlank() throws Exception {
        UpdateUsernameRequest request = new UpdateUsernameRequest();
        request.setUsername("");

        mockMvc.perform(patch("/api/user/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
