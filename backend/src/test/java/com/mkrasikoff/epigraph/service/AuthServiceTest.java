package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private QuoteService quoteService;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private EntityManager entityManager;

    @InjectMocks
    private AuthService authService;

    private User buildUser(Long id, String email, boolean verified) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setPassword("encoded");
        u.setEmailVerified(verified);
        return u;
    }

    @Test
    @DisplayName("register: saves new user and sends verification code")
    void register_savesUserAndSendsCode() {
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass123")).thenReturn("encoded");

        authService.register("test@mail.com", "pass123");

        verify(userRepository).save(argThat(u ->
                "test@mail.com".equals(u.getEmail()) &&
                        "encoded".equals(u.getPassword()) &&
                        !u.isEmailVerified() &&
                        "local".equals(u.getProvider()) &&
                        "test".equals(u.getUsername())
        ));
        verify(emailVerificationService).sendCode("test@mail.com");
    }

    @Test
    @DisplayName("register: derives username from email local part, sanitized and padded")
    void register_derivesUsernameFromEmail() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        authService.register("ivan.petrov+news@mail.com", "pass123");
        authService.register("a@x.com", "pass123");
        authService.register("ThisIsAVeryLongLocalPartOfAnEmail@mail.com", "pass123");

        verify(userRepository).save(argThat(u -> "ivanpetrovnews".equals(u.getUsername())));
        verify(userRepository).save(argThat(u -> "a__".equals(u.getUsername())));
        verify(userRepository).save(argThat(u -> "ThisIsAVeryLongLocal".equals(u.getUsername())));
    }

    @Test
    @DisplayName("register: throws when email is already verified")
    void register_throws_whenEmailAlreadyVerified() {
        User existing = buildUser(1L, "test@mail.com", true);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.register("test@mail.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("уже зарегистрирован");
    }

    @Test
    @DisplayName("register: deletes stale unverified user and re-registers")
    void register_deletesUnverifiedAndReregisters() {
        User stale = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(stale));
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        authService.register("test@mail.com", "newpass");

        verify(userRepository).delete(stale);
        verify(userRepository).flush();
        verify(userRepository).save(any(User.class));
        verify(emailVerificationService).sendCode("test@mail.com");
    }

    @Test
    @DisplayName("verify: verifies code, marks user verified, creates quotes, returns token")
    void verify_completesRegistration() {
        User user = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L, "test@mail.com")).thenReturn("jwt-token");

        String token = authService.verify("test@mail.com", "123456");

        verify(emailVerificationService).verifyCode("test@mail.com", "123456");
        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
        verify(quoteService).createDefaultQuotes(1L);
        assertThat(token).isEqualTo("jwt-token");
    }

    @Test
    @DisplayName("verify: throws when user not found after code validation")
    void verify_throws_whenUserNotFound() {
        when(userRepository.findByEmail("ghost@mail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verify("ghost@mail.com", "000000"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("не найден");
    }

    @Test
    @DisplayName("resendCode: sends code when user exists and is not verified")
    void resendCode_sendsCode_whenUnverified() {
        User user = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));

        authService.resendCode("test@mail.com");

        verify(emailVerificationService).sendCode("test@mail.com");
    }

    @Test
    @DisplayName("resendCode: does nothing when user is already verified")
    void resendCode_doesNothing_whenAlreadyVerified() {
        User user = buildUser(1L, "test@mail.com", true);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));

        authService.resendCode("test@mail.com");

        verify(emailVerificationService, never()).sendCode(any());
    }

    @Test
    @DisplayName("resendCode: does nothing when email is unknown")
    void resendCode_doesNothing_whenEmailUnknown() {
        when(userRepository.findByEmail("unknown@mail.com")).thenReturn(Optional.empty());

        authService.resendCode("unknown@mail.com");

        verify(emailVerificationService, never()).sendCode(any());
    }

    @Test
    @DisplayName("login: returns token when credentials are correct")
    void login_returnsToken_whenCredentialsValid() {
        User user = buildUser(1L, "test@mail.com", true);
        user.setPassword("encoded");
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("pass123", "encoded")).thenReturn(true);
        when(jwtService.generateToken(1L, "test@mail.com")).thenReturn("jwt-token");

        String token = authService.login("test@mail.com", "pass123");

        assertThat(token).isEqualTo("jwt-token");
    }

    @Test
    @DisplayName("login: returns null when password is wrong")
    void login_returnsNull_whenWrongPassword() {
        User user = buildUser(1L, "test@mail.com", true);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(any(), any())).thenReturn(false);

        String token = authService.login("test@mail.com", "wrongpass");

        assertThat(token).isNull();
    }

    @Test
    @DisplayName("login: returns null when user is not verified")
    void login_returnsNull_whenNotVerified() {
        User user = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));

        String token = authService.login("test@mail.com", "pass123");

        assertThat(token).isNull();
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("login: returns null when email does not exist")
    void login_returnsNull_whenEmailNotFound() {
        when(userRepository.findByEmail("nobody@mail.com")).thenReturn(Optional.empty());

        String token = authService.login("nobody@mail.com", "pass");

        assertThat(token).isNull();
    }
}
