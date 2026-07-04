package com.mkrasikoff.epigraph.config;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import com.mkrasikoff.epigraph.service.JwtService;
import com.mkrasikoff.epigraph.service.QuoteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final QuoteService quoteService;

    public OAuth2SuccessHandler(UserRepository userRepository,
                                JwtService jwtService,
                                QuoteService quoteService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.quoteService = quoteService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        // Identify provider
        String providerId;
        String email;
        String providerName;
        String suggestedUsername;

        if (oauthUser.getAttribute("sub") != null) {
            // Google — prefer the given (first) name, fall back to the full name
            email = oauthUser.getAttribute("email");
            providerId = oauthUser.getAttribute("sub");
            providerName = "google";

            String givenName = oauthUser.getAttribute("given_name");
            String fullName = oauthUser.getAttribute("name");

            suggestedUsername = givenName != null ? givenName : fullName;
        } else {
            // Yandex — prefer the account login (already handle-like), fall back to display name
            Object idObj = oauthUser.getAttribute("id");
            providerId = idObj != null ? idObj.toString() : null;
            email = oauthUser.getAttribute("default_email");
            providerName = "yandex";

            String login = oauthUser.getAttribute("login");
            String displayName = oauthUser.getAttribute("display_name");

            suggestedUsername = login != null ? login : displayName;
        }

        Optional<User> existingUser = userRepository.findByEmail(email);
        boolean isNewUser = existingUser.isEmpty();

        String finalEmail = email;
        String finalProviderId = providerId;
        String finalProviderName = providerName;
        String finalUsername = sanitizeUsername(suggestedUsername);

        User user = existingUser.orElseGet(() -> {
            User newUser = new User();

            newUser.setEmail(finalEmail);
            newUser.setProvider(finalProviderName);
            newUser.setProviderId(finalProviderId);
            newUser.setUsername(finalUsername);
            newUser.setCreatedAt(System.currentTimeMillis());

            return userRepository.save(newUser);
        });

        if (isNewUser) {
            quoteService.createDefaultQuotes(user.getId());
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());

        response.sendRedirect("/?token=" + token);
    }

    /**
     * Cleans up a name pulled from an OAuth provider so it fits the username
     * constraints (3–20 chars, letters/digits/underscore only). Returns null
     * when nothing usable is left — the client will then show a fallback.
     */
    private String sanitizeUsername(String raw) {
        if (raw == null || raw.isBlank()) return null;

        String cleaned = raw.trim().replaceAll("[^a-zA-Z0-9_]", "");
        if (cleaned.length() > 20) cleaned = cleaned.substring(0, 20);

        return cleaned.length() >= 3 ? cleaned : null;
    }
}
