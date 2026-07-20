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

        authService.register("test@mail.com", "pass123", null);

        verify(userRepository).save(argThat(u ->
                "test@mail.com".equals(u.getEmail()) &&
                        "encoded".equals(u.getPassword()) &&
                        !u.isEmailVerified() &&
                        "local".equals(u.getProvider()) &&
                        "test".equals(u.getUsername())
        ));
        verify(emailVerificationService).sendCode("test@mail.com", null);
    }

    @Test
    @DisplayName("register: derives username from email local part, sanitized and padded")
    void register_derivesUsernameFromEmail() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        authService.register("ivan.petrov+news@mail.com", "pass123", null);
        authService.register("a@x.com", "pass123", null);
        authService.register("ThisIsAVeryLongLocalPartOfAnEmail@mail.com", "pass123", null);

        verify(userRepository).save(argThat(u -> "ivanpetrovnews".equals(u.getUsername())));
        verify(userRepository).save(argThat(u -> "a__".equals(u.getUsername())));
        verify(userRepository).save(argThat(u -> "ThisIsAVeryLongLocal".equals(u.getUsername())));
    }

    @Test
    @DisplayName("register: throws when email is already verified")
    void register_throws_whenEmailAlreadyVerified() {
        User existing = buildUser(1L, "test@mail.com", true);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> authService.register("test@mail.com", "pass", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("EMAIL_ALREADY_REGISTERED");
    }

    @Test
    @DisplayName("register: deletes stale unverified user and re-registers")
    void register_deletesUnverifiedAndReregisters() {
        User stale = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(stale));
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        authService.register("test@mail.com", "newpass", null);

        verify(userRepository).delete(stale);
        verify(userRepository).flush();
        verify(userRepository).save(any(User.class));
        verify(emailVerificationService).sendCode("test@mail.com", null);
    }

    @Test
    @DisplayName("verify: verifies code, marks user verified, creates quotes, returns token")
    void verify_completesRegistration() {
        User user = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L, "test@mail.com")).thenReturn("jwt-token");

        String token = authService.verify("test@mail.com", "123456", null);

        verify(emailVerificationService).verifyCode("test@mail.com", "123456");
        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
        verify(quoteService).createDefaultQuotes(1L, "ru");
        assertThat(token).isEqualTo("jwt-token");
    }

    @Test
    @DisplayName("verify: throws when user not found after code validation")
    void verify_throws_whenUserNotFound() {
        when(userRepository.findByEmail("ghost@mail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verify("ghost@mail.com", "000000", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");
    }

    @Test
    @DisplayName("resendCode: sends code when user exists and is not verified")
    void resendCode_sendsCode_whenUnverified() {
        User user = buildUser(1L, "test@mail.com", false);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));

        authService.resendCode("test@mail.com", null);

        verify(emailVerificationService).sendCode("test@mail.com", null);
    }

    @Test
    @DisplayName("resendCode: does nothing when user is already verified")
    void resendCode_doesNothing_whenAlreadyVerified() {
        User user = buildUser(1L, "test@mail.com", true);
        when(userRepository.findByEmail("test@mail.com")).thenReturn(Optional.of(user));

        authService.resendCode("test@mail.com", null);

        verify(emailVerificationService, never()).sendCode(any(), any());
    }

    @Test
    @DisplayName("resendCode: does nothing when email is unknown")
    void resendCode_doesNothing_whenEmailUnknown() {
        when(userRepository.findByEmail("unknown@mail.com")).thenReturn(Optional.empty());

        authService.resendCode("unknown@mail.com", null);

        verify(emailVerificationService, never()).sendCode(any(), any());
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

    @Test
    @DisplayName("provisionOAuthUser: creates new user, sanitizes username, and seeds onboarding quotes")
    void provisionOAuthUser_createsNewUserAndSeedsQuotes() {
        when(userRepository.findByEmail("new@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(7L);
            return u;
        });

        User result = authService.provisionOAuthUser("new@gmail.com", "google", "sub-9", "Mikhail Krasikov", null);

        verify(userRepository).save(argThat(u ->
                "new@gmail.com".equals(u.getEmail()) &&
                        "google".equals(u.getProvider()) &&
                        "sub-9".equals(u.getProviderId()) &&
                        "MikhailKrasikov".equals(u.getUsername())
        ));
        verify(quoteService).createDefaultQuotes(7L, "ru");
        assertThat(result.getId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("provisionOAuthUser: falls back to the email-derived username for a Cyrillic display name")
    void provisionOAuthUser_fallsBackToEmailUsername_whenProviderNameUnusable() {
        when(userRepository.findByEmail("mkrasikoff@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(8L);
            return u;
        });

        // A fully Cyrillic Google display name sanitizes to nothing. Leaving the
        // username null would make the account permanently unfindable in friend
        // search, since SQL LIKE never matches NULL (TASK-129).
        authService.provisionOAuthUser("mkrasikoff@gmail.com", "google", "sub-1", "Михаил Красиков", null);

        verify(userRepository).save(argThat(u -> "mkrasikoff".equals(u.getUsername())));
    }

    @Test
    @DisplayName("provisionOAuthUser: falls back to the email-derived username when the provider sends no name")
    void provisionOAuthUser_fallsBackToEmailUsername_whenProviderNameMissing() {
        when(userRepository.findByEmail("someone@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(9L);
            return u;
        });

        authService.provisionOAuthUser("someone@gmail.com", "google", "sub-2", null, null);

        verify(userRepository).save(argThat(u -> "someone".equals(u.getUsername())));
    }

    @Test
    @DisplayName("provisionOAuthUser: returns existing user without re-saving or seeding quotes")
    void provisionOAuthUser_returnsExistingUser() {
        User existing = buildUser(5L, "user@gmail.com", true);
        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.of(existing));

        User result = authService.provisionOAuthUser("user@gmail.com", "google", "sub-1", "Whatever", null);

        assertThat(result).isSameAs(existing);
        verify(userRepository, never()).save(any());
        verify(quoteService, never()).createDefaultQuotes(any(), any());
    }

    @Test
    @DisplayName("provisionOAuthUser: username too short after sanitizing falls back to the email-derived one")
    void provisionOAuthUser_shortUsernameFallsBackToEmail() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        authService.provisionOAuthUser("x@gmail.com", "google", "sub", "A!", null);

        // Was null before TASK-129. deriveUsername() pads a 1-char local part to
        // the 3-char minimum, so this lands on "x__" rather than nothing.
        verify(userRepository).save(argThat(u -> "x__".equals(u.getUsername())));
    }

    @Test
    @DisplayName("provisionOAuthUser: username longer than 20 chars is truncated")
    void provisionOAuthUser_longUsernameTruncated() {
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        authService.provisionOAuthUser("x@gmail.com", "google", "sub", "ThisIsAVeryLongGivenNameIndeed", null);

        verify(userRepository).save(argThat(u ->
                u.getUsername() != null &&
                        u.getUsername().length() == 20 &&
                        "ThisIsAVeryLongGiven".equals(u.getUsername())
        ));
    }

    @Test
    @DisplayName("verify: language 'en' sets the account language and seeds English quotes")
    void verify_en_setsLanguageAndSeedsEnglish() {
        User user = buildUser(1L, "en@mail.com", false);
        when(userRepository.findByEmail("en@mail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L, "en@mail.com")).thenReturn("jwt-token");

        authService.verify("en@mail.com", "123456", "en");

        assertThat(user.getPreferredLanguage()).isEqualTo("en");
        verify(quoteService).createDefaultQuotes(1L, "en");
    }

    @Test
    @DisplayName("provisionOAuthUser: language 'en' sets the account language and seeds English quotes")
    void provisionOAuthUser_en_setsLanguageAndSeedsEnglish() {
        when(userRepository.findByEmail("en@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(9L);
            return u;
        });

        authService.provisionOAuthUser("en@gmail.com", "google", "sub-en", "Jane", "en");

        verify(userRepository).save(argThat(u -> "en".equals(u.getPreferredLanguage())));
        verify(quoteService).createDefaultQuotes(9L, "en");
    }
}
