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

        if (oauthUser.getAttribute("sub") != null) {
            // Google
            email = oauthUser.getAttribute("email");
            providerId = oauthUser.getAttribute("sub");
            providerName = "google";
        } else {
            // Yandex
            Object idObj = oauthUser.getAttribute("id");
            providerId = idObj != null ? idObj.toString() : null;
            email = oauthUser.getAttribute("default_email");
            providerName = "yandex";
        }

        boolean isNewUser = !userRepository.existsByEmail(email);

        String finalEmail = email;
        String finalProviderId = providerId;
        String finalProviderName = providerName;

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();

            newUser.setEmail(finalEmail);
            newUser.setProvider(finalProviderName);
            newUser.setProviderId(finalProviderId);
            newUser.setCreatedAt(System.currentTimeMillis());

            return userRepository.save(newUser);
        });

        if (isNewUser) {
            quoteService.createDefaultQuotes(user.getId());
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());

        response.sendRedirect("/?token=" + token);
    }
}
