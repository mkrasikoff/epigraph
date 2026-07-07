package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.AuthRequest;
import com.mkrasikoff.epigraph.dto.AuthResponse;
import com.mkrasikoff.epigraph.dto.ErrorResponse;
import com.mkrasikoff.epigraph.dto.MeResponse;
import com.mkrasikoff.epigraph.dto.RegisterRequest;
import com.mkrasikoff.epigraph.dto.VerifyRequest;
import com.mkrasikoff.epigraph.service.AuthService;
import com.mkrasikoff.epigraph.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt — email = {}", request.getEmail());

        authService.register(request.getEmail(), request.getPassword(), request.getUsername());

        log.info("Verification code sent — email = {}", request.getEmail());
    }

    /**
     * Returns the authenticated user's own profile (id, email, username).
     * Used by the client to display real account info instead of a placeholder.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Long userId) {
        return userService.findById(userId)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(new MeResponse(user.getId(), user.getEmail(), user.getUsername(), user.getAvatarIcon(), user.getPreferredLanguage())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("Пользователь не найден")));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@Valid @RequestBody VerifyRequest request) {
        try {
            String token = authService.verify(request.getEmail(), request.getCode());

            log.info("New user verified and registered — email = {}", request.getEmail());

            return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resend(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return;

        authService.resendCode(email);

        log.info("Verification code resent — email = {}", email);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        String token = authService.login(request.getEmail(), request.getPassword());

        if (token == null) {
            log.info("Login failed — email = {}", request.getEmail());

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse("Неверный email или пароль"));
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
    public void forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) return;

        userService.initiatePasswordReset(email);

        log.info("Password reset requested — email = {}", email);
    }
}
