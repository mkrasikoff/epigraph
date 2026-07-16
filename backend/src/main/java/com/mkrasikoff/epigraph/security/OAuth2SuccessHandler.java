package com.mkrasikoff.epigraph.security;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.service.AuthService;
import com.mkrasikoff.epigraph.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Web adapter for the OAuth2 login success callback: pulls the provider-specific identity
 * attributes out of the {@link OAuth2User}, hands them to {@link AuthService#provisionOAuthUser}
 * (which owns the find-or-create + onboarding-seed business logic), then issues the token redirect.
 */
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtService jwtService;

    public OAuth2SuccessHandler(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String provider;
        String email;
        String providerId;
        String suggestedUsername;

        if (oauthUser.getAttribute("sub") != null) {
            // Google — prefer the given (first) name, fall back to the full name
            email = oauthUser.getAttribute("email");
            providerId = oauthUser.getAttribute("sub");
            provider = "google";

            String givenName = oauthUser.getAttribute("given_name");
            String fullName = oauthUser.getAttribute("name");
            suggestedUsername = givenName != null ? givenName : fullName;
        } else {
            // Yandex — prefer the account login (already handle-like), fall back to display name
            Object idObj = oauthUser.getAttribute("id");
            providerId = idObj != null ? idObj.toString() : null;
            email = oauthUser.getAttribute("default_email");
            provider = "yandex";

            String login = oauthUser.getAttribute("login");
            String displayName = oauthUser.getAttribute("display_name");
            suggestedUsername = login != null ? login : displayName;
        }

        String language = readLangCookie(request);
        User user = authService.provisionOAuthUser(email, provider, providerId, suggestedUsername, language);
        String token = jwtService.generateToken(user.getId(), user.getEmail());

        response.sendRedirect("/?token=" + token);
    }

    /**
     * Reads the guest-selected UI language from the {@code epigraph_lang} cookie, which the client
     * sets before initiating OAuth. Present on the provider callback (a SameSite=Lax top-level
     * navigation), so the new account can be seeded in the right language. Null when absent.
     */
    private static String readLangCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;

        for (Cookie cookie : request.getCookies()) {
            if ("epigraph_lang".equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
