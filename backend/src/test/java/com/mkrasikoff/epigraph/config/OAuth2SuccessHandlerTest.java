package com.mkrasikoff.epigraph.config;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.service.AuthService;
import com.mkrasikoff.epigraph.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the handler's web-adapter responsibility only: extracting the right identity attributes
 * per provider and issuing the token redirect. The find-or-create + username-sanitizing logic now
 * lives in {@link AuthService#provisionOAuthUser} and is covered by AuthServiceTest.
 */
@ExtendWith(MockitoExtension.class)
class OAuth2SuccessHandlerTest {

    @Mock private AuthService authService;
    @Mock private JwtService jwtService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;

    private OAuth2SuccessHandler handler() {
        return new OAuth2SuccessHandler(authService, jwtService);
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

    private User user(Long id, String email) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        return u;
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Google identity passed through with given_name as suggested username")
    void googleUser_passesGivenName() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", "Mikhail", "Mikhail Krasikov");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(authService.provisionOAuthUser("user@gmail.com", "google", "sub-123", "Mikhail"))
                .thenReturn(user(1L, "user@gmail.com"));
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        verify(authService).provisionOAuthUser("user@gmail.com", "google", "sub-123", "Mikhail");
        verify(response).sendRedirect("/?token=jwt-token");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Google falls back to full name when given_name missing")
    void googleUser_fallsBackToFullName() throws Exception {
        OAuth2User oauthUser = googleUser("user@gmail.com", "sub-123", null, "Mikhail Krasikov");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(authService.provisionOAuthUser("user@gmail.com", "google", "sub-123", "Mikhail Krasikov"))
                .thenReturn(user(1L, "user@gmail.com"));
        when(jwtService.generateToken(1L, "user@gmail.com")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        verify(authService).provisionOAuthUser("user@gmail.com", "google", "sub-123", "Mikhail Krasikov");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Yandex identity passed through with login as suggested username")
    void yandexUser_passesLogin() throws Exception {
        OAuth2User oauthUser = yandexUser("user@yandex.ru", "yid-1", "mkrasikoff", "Mikhail K.");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(authService.provisionOAuthUser("user@yandex.ru", "yandex", "yid-1", "mkrasikoff"))
                .thenReturn(user(2L, "user@yandex.ru"));
        when(jwtService.generateToken(2L, "user@yandex.ru")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        verify(authService).provisionOAuthUser("user@yandex.ru", "yandex", "yid-1", "mkrasikoff");
        verify(response).sendRedirect("/?token=jwt-token");
    }

    @Test
    @DisplayName("onAuthenticationSuccess: Yandex falls back to display_name when login missing")
    void yandexUser_fallsBackToDisplayName() throws Exception {
        OAuth2User oauthUser = yandexUser("user@yandex.ru", "yid-1", null, "Mikhail K");
        Authentication authentication = new TestingAuthenticationToken(oauthUser, null);

        when(authService.provisionOAuthUser("user@yandex.ru", "yandex", "yid-1", "Mikhail K"))
                .thenReturn(user(2L, "user@yandex.ru"));
        when(jwtService.generateToken(2L, "user@yandex.ru")).thenReturn("jwt-token");

        handler().onAuthenticationSuccess(request, response, authentication);

        verify(authService).provisionOAuthUser("user@yandex.ru", "yandex", "yid-1", "Mikhail K");
    }
}
