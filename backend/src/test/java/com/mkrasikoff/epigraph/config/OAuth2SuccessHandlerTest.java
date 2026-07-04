package com.mkrasikoff.epigraph.config;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import com.mkrasikoff.epigraph.service.JwtService;
import com.mkrasikoff.epigraph.service.QuoteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuth2SuccessHandlerTest {

    @Mock private UserRepository userRepository;
    @Mock private JwtService jwtService;
    @Mock private QuoteService quoteService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private OAuth2SuccessHandler handler() {
        return new OAuth2SuccessHandler(userRepository, jwtService, quoteService);
    }

    private OAuth2User googleUser(String email, String sub, String givenName, String name) {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("email", email);
        attrs.put("sub", sub);
        if (givenName != null) attrs.put("given_name", givenName);
        if (name != null) attrs.put("name", name);
        return new DefaultOAuth2User(List.of(() -> "ROLE_USER"), attrs, "sub");
    }

    private OAuth2User yandexUser(String email, String id, String login, String displayName) {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("default_email", email);
        attrs.put("id", id);
        if (login != null) attrs.put("login", login);
        if (displayName != null) attrs.put("display_name", displayName);
        return new DefaultOAuth2User(List.of(() -> "ROLE_USER"), attrs, "id");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: new Google user gets username from given_name")
    void newGoogleUser_getsUsernameFromGivenName() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", "Mikhail", "Mikhail Krasikov");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("Mikhail");
        assertThat(captor.getValue().getProvider()).isEqualTo("google");
        verify(quoteService).createDefaultQuotes(1L);
        verify(response).sendRedirect("/?token=jwt-token");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: new Google user falls back to full name when given_name missing")
    void newGoogleUser_fallsBackToFullName() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", null, "Mikhail Krasikov");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("MikhailKrasikov");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: new Yandex user gets username from login")
    void newYandexUser_getsUsernameFromLogin() throws Exception {
        OAuth2User oauthUser = yandexUser("user@yandex.ru", "yid-1", "mkrasikoff", "Mikhail K.");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@yandex.ru")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(jwtService.generateToken(2L, "user@yandex.ru")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("mkrasikoff");
        assertThat(captor.getValue().getProvider()).isEqualTo("yandex");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: new Yandex user falls back to display_name when login missing")
    void newYandexUser_fallsBackToDisplayName() throws Exception {
        OAuth2User oauthUser = yandexUser("user@yandex.ru", "yid-1", null, "Mikhail K");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@yandex.ru")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(jwtService.generateToken(2L, "user@yandex.ru")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("MikhailK");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: sanitized username shorter than 3 chars becomes null")
    void suggestedUsername_tooShortAfterSanitizing_becomesNull() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", "A!", null);
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isNull();
    }

    @Test
    @DisplayName("onAuthenticationSuccess: suggested username longer than 20 chars is truncated")
    void suggestedUsername_longerThan20_isTruncated() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", "ThisIsAVeryLongGivenNameIndeed", null);
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).hasSize(20);
        assertThat(captor.getValue().getUsername()).isEqualTo("ThisIsAVeryLongGiven");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: existing user does not create quotes and is not re-saved")
    void existingUser_doesNotCreateQuotesOrResave() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", "Mikhail", null);
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        User existing = new User();
        existing.setId(5L);
        existing.setEmail("user@gmail.com");
        existing.setUsername("existingname");
        when(userRepository.findByEmail("user@gmail.com")).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(5L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        verify(userRepository, never()).save(any());
        verify(quoteService, never()).createDefaultQuotes(any());
        verify(response).sendRedirect("/?token=jwt-token");
    }
}
