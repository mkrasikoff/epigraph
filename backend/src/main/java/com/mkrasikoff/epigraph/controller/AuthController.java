package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.auth.AuthRequest;
import com.mkrasikoff.epigraph.dto.auth.AuthResponse;
import com.mkrasikoff.epigraph.dto.common.ErrorResponse;
import com.mkrasikoff.epigraph.dto.auth.MeResponse;
import com.mkrasikoff.epigraph.dto.auth.RegisterRequest;
import com.mkrasikoff.epigraph.dto.auth.VerifyRequest;
import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.AuthService;
import com.mkrasikoff.epigraph.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final UserService userService;
    private final AchievementService achievementService;

    public AuthController(AuthService authService, UserService userService, AchievementService achievementService) {
        this.authService = authService;
        this.userService = userService;
        this.achievementService = achievementService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void register(@Valid @RequestBody RegisterRequest request,
                         @CookieValue(value = "epigraph_lang", required = false) String language) {
        log.info("Registration attempt — email = {}", request.getEmail());

        authService.register(request.getEmail(), request.getPassword(), language);

        log.info("Verification code sent — email = {}", request.getEmail());
    }

    /**
     * Returns the authenticated user's own profile (id, email, username).
     * Used by the client to display real account info instead of a placeholder,
     * and called once on every app bootstrap — which as of TASK-124 is also
     * what marks "today" as an activity day (see AchievementService), since a
     * day of activity is meant to mean "opened Epigraph", not "happened to
     * add or edit a quote today".
     *
     * markActiveToday() itself is one cheap exists-check either way, but the
     * full evaluate() (multiple counts + up to 13 upserts + badge re-equip)
     * only runs when it returns true — i.e. only on the first request of a
     * new calendar day per user. Every later reload/refresh that same day
     * short-circuits after the exists-check, since nothing evaluate() would
     * recompute can have changed without either a new day or a quote
     * mutation (which already re-evaluates on its own, see QuoteController).
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Long userId) {
        return userService.findById(userId)
                .<ResponseEntity<?>>map(user -> {
                    boolean isNewActivityDay = achievementService.markActiveToday(userId);
                    if (!isNewActivityDay) {
                        return ResponseEntity.ok(new MeResponse(user.getId(), user.getEmail(), user.getUsername(), user.getAvatarIcon(), user.getPreferredLanguage(), user.getThemeStyle(), user.getEquippedBadge(), user.getPlusSince() != null));
                    }

                    achievementService.evaluate(userId);
                    // Re-fetch after evaluate() — a badge crossed today's threshold
                    // auto-equips inside evaluate(), and `user` fetched above is a
                    // detached snapshot from before that ran, so it would still
                    // report the old badge.
                    User refreshed = userService.findById(userId).orElse(user);
                    return ResponseEntity.ok(new MeResponse(refreshed.getId(), refreshed.getEmail(), refreshed.getUsername(), refreshed.getAvatarIcon(), refreshed.getPreferredLanguage(), refreshed.getThemeStyle(), refreshed.getEquippedBadge(), refreshed.getPlusSince() != null));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse(ApiCodes.USER_NOT_FOUND)));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody VerifyRequest request,
                                    @CookieValue(value = "epigraph_lang", required = false) String preferredLanguage) {
        try {
            String token = authService.verify(request.getEmail(), request.getCode(), preferredLanguage);

            log.info("New user verified and registered — email = {}", request.getEmail());

            return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resend(@RequestBody Map<String, String> body,
                       @CookieValue(value = "epigraph_lang", required = false) String language) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return;

        authService.resendCode(email, language);

        log.info("Verification code resent — email = {}", email);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        String token = authService.login(request.getEmail(), request.getPassword());

        if (token == null) {
            log.info("Login failed — email = {}", request.getEmail());

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(ApiCodes.INVALID_CREDENTIALS));
        }

        log.info("User logged in — email = {}", request.getEmail());

        return ResponseEntity.ok(new AuthResponse(token));
    }

    /**
     * Initiates a password-reset flow: sends a reset link to the given email.
     * Always returns 202 to avoid leaking whether the email is registered.
     */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgotPassword(@RequestBody Map<String, String> body,
                               @CookieValue(value = "epigraph_lang", required = false) String language) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return;

        userService.initiatePasswordReset(email, language);

        log.info("Password reset requested — email = {}", email);
    }
}
