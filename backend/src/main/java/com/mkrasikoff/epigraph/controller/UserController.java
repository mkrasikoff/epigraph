package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.AuthResponse;
import com.mkrasikoff.epigraph.dto.ChangePasswordRequest;
import com.mkrasikoff.epigraph.dto.ErrorResponse;
import com.mkrasikoff.epigraph.dto.UpdateAvatarRequest;
import com.mkrasikoff.epigraph.dto.UpdatePreferredLanguageRequest;
import com.mkrasikoff.epigraph.dto.UpdateThemeStyleRequest;
import com.mkrasikoff.epigraph.dto.UpdateUsernameRequest;
import com.mkrasikoff.epigraph.service.JwtService;
import com.mkrasikoff.epigraph.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final JwtService jwtService;

    public UserController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    /**
     * Permanently deletes the authenticated user's account and all associated data.
     */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal Long userId) {
        userService.deleteAccount(userId);
        log.info("Account deleted — userId = {}", userId);
    }

    /**
     * Changes or sets the authenticated user's password.
     * Google users can call this without providing a current password.
     */
    @PatchMapping("/me/password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal Long userId,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        try {
            userService.changePassword(userId, request.getNewPassword());
            log.info("Password changed — userId = {}", userId);

            return ResponseEntity.ok(new ErrorResponse("Пароль успешно изменён"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Updates the authenticated user's display name (username).
     * Purely cosmetic — not unique across users.
     */
    @PatchMapping("/me/username")
    public ResponseEntity<?> updateUsername(@AuthenticationPrincipal Long userId,
                                            @Valid @RequestBody UpdateUsernameRequest request) {
        try {
            userService.updateUsername(userId, request.getUsername());
            log.info("Username updated — userId = {}", userId);

            return ResponseEntity.ok(new ErrorResponse("Имя пользователя обновлено"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Updates the authenticated user's avatar icon (one of a fixed set of presets).
     */
    @PatchMapping("/me/avatar")
    public ResponseEntity<?> updateAvatarIcon(@AuthenticationPrincipal Long userId,
                                              @Valid @RequestBody UpdateAvatarRequest request) {
        try {
            userService.updateAvatarIcon(userId, request.getAvatarIcon());
            log.info("Avatar icon updated — userId = {}", userId);

            return ResponseEntity.ok(new ErrorResponse("Иконка обновлена"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Updates the authenticated user's interface language preference.
     */
    @PatchMapping("/me/language")
    public ResponseEntity<?> updatePreferredLanguage(@AuthenticationPrincipal Long userId,
                                                      @Valid @RequestBody UpdatePreferredLanguageRequest request) {
        try {
            userService.updatePreferredLanguage(userId, request.getPreferredLanguage());
            log.info("Preferred language updated — userId = {}", userId);

            return ResponseEntity.ok(new ErrorResponse("Язык обновлён"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Updates the authenticated user's visual theme style (one of a fixed set of presets).
     */
    @PatchMapping("/me/theme")
    public ResponseEntity<?> updateThemeStyle(@AuthenticationPrincipal Long userId,
                                              @Valid @RequestBody UpdateThemeStyleRequest request) {
        try {
            userService.updateThemeStyle(userId, request.getThemeStyle());
            log.info("Theme style updated — userId = {}", userId);

            return ResponseEntity.ok(new ErrorResponse("Тема обновлена"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Resets the user's password using a short-lived reset token from the email link.
     * Returns a new session JWT so the user is immediately logged in after reset.
     */
    @PatchMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String resetToken = body.get("resetToken");
        String newPassword = body.get("newPassword");

        if (resetToken == null || resetToken.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Некорректный запрос"));
        }

        if (!jwtService.isResetTokenValid(resetToken)) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Ссылка недействительна или истекла"));
        }

        try {
            Long userId = jwtService.extractUserId(resetToken);
            userService.changePassword(userId, newPassword);

            // Return a fresh session token so the user is logged in immediately
            String sessionToken = jwtService.generateToken(userId,
                    userService.getEmailByUserId(userId));

            log.info("Password reset completed via email link — userId = {}", userId);

            return ResponseEntity.ok(new AuthResponse(sessionToken));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }
}
