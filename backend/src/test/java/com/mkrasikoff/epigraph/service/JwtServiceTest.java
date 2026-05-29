package com.mkrasikoff.epigraph.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    // Valid Base64-encoded 256-bit secret for tests
    private static final String TEST_SECRET = "dGVzdC1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2gtZm9yLUhTMjU2";
    private static final long EXPIRATION_MS = 3_600_000L; // 1 hour

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", EXPIRATION_MS);
    }

    @Test
    @DisplayName("generateToken: returns non-blank token")
    void generateToken_returnsToken() {
        String token = jwtService.generateToken(1L, "user@mail.com");

        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("extractUserId: returns correct userId from token")
    void extractUserId_returnsCorrectId() {
        String token = jwtService.generateToken(42L, "user@mail.com");

        Long userId = jwtService.extractUserId(token);

        assertThat(userId).isEqualTo(42L);
    }

    @Test
    @DisplayName("generateToken: different users produce different tokens")
    void generateToken_differentUsersProduceDifferentTokens() {
        String token1 = jwtService.generateToken(1L, "a@mail.com");
        String token2 = jwtService.generateToken(2L, "b@mail.com");

        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    @DisplayName("isTokenValid: returns true for a fresh token")
    void isTokenValid_returnsTrue_forFreshToken() {
        String token = jwtService.generateToken(1L, "user@mail.com");

        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    @DisplayName("isTokenValid: returns false for a tampered token")
    void isTokenValid_returnsFalse_forTamperedToken() {
        String token = jwtService.generateToken(1L, "user@mail.com");
        String tampered = token.substring(0, token.length() - 4) + "XXXX";

        assertThat(jwtService.isTokenValid(tampered)).isFalse();
    }

    @Test
    @DisplayName("isTokenValid: returns false for a random string")
    void isTokenValid_returnsFalse_forGarbage() {
        assertThat(jwtService.isTokenValid("not.a.jwt")).isFalse();
    }

    @Test
    @DisplayName("isTokenValid: returns false for an expired token")
    void isTokenValid_returnsFalse_forExpiredToken() {
        // Set expiration to -1ms so the token is already expired at creation
        ReflectionTestUtils.setField(jwtService, "expirationMs", -1L);
        String token = jwtService.generateToken(1L, "user@mail.com");

        assertThat(jwtService.isTokenValid(token)).isFalse();
    }
    
    @Test
    @DisplayName("generateResetToken: produces a valid reset token")
    void generateResetToken_producesValidToken() {
        String token = jwtService.generateResetToken(1L);

        assertThat(token).isNotBlank();
        assertThat(jwtService.isResetTokenValid(token)).isTrue();
    }

    @Test
    @DisplayName("isResetTokenValid: returns false for a regular session token")
    void isResetTokenValid_returnsFalse_forSessionToken() {
        String sessionToken = jwtService.generateToken(1L, "user@mail.com");

        assertThat(jwtService.isResetTokenValid(sessionToken)).isFalse();
    }

    @Test
    @DisplayName("isResetTokenValid: returns false for garbage input")
    void isResetTokenValid_returnsFalse_forGarbage() {
        assertThat(jwtService.isResetTokenValid("garbage")).isFalse();
    }

    @Test
    @DisplayName("extractUserId: works correctly for reset token")
    void extractUserId_worksForResetToken() {
        String token = jwtService.generateResetToken(99L);

        assertThat(jwtService.extractUserId(token)).isEqualTo(99L);
    }
}
