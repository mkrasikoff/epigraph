package com.mkrasikoff.epigraph.security;

import com.mkrasikoff.epigraph.geo.GeoBlockFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Set;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Path prefixes that are handled elsewhere in this chain (API, OAuth, share links) — a GET
     * outside all of these, and without a static-asset file extension, is an unknown frontend
     * route (e.g. a typo'd URL) rather than a protected resource, so it's let through to render
     * static/error/404.html instead of the OAuth2 login page.
     */
    private static final Set<String> RESERVED_PREFIXES = Set.of("/api", "/oauth2", "/login", "/s");

    private final JwtAuthFilter jwtAuthFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final GeoBlockFilter geoBlockFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, OAuth2SuccessHandler oAuth2SuccessHandler, GeoBlockFilter geoBlockFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
        this.geoBlockFilter = geoBlockFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/user/reset-password").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/api/banner").permitAll()
                        .requestMatchers("/api/geo").permitAll()
                        // Server-to-server webhooks authenticate by signature in the controller, not by JWT.
                        .requestMatchers(HttpMethod.POST, "/api/webhooks/**").permitAll()
                        .requestMatchers("/", "/index.html", "/js/**", "/css/**", "/*.js", "/*.css", "/*.png", "/*.ico").permitAll()
                        .requestMatchers("/robots.txt", "/sitemap.xml").permitAll()
                        .requestMatchers("/manifest.json", "/api/push/vapid-public-key").permitAll()
                        .requestMatchers("/s/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/shared/*").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(this::isUnknownFrontendRoute).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(geoBlockFilter, OAuth2AuthorizationRequestRedirectFilter.class)
                .oauth2Login(oauth -> oauth
                        .successHandler(oAuth2SuccessHandler)
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private boolean isUnknownFrontendRoute(HttpServletRequest request) {
        if (!HttpMethod.GET.matches(request.getMethod())) return false;

        String path = request.getRequestURI();
        if (path.equals("/") || path.equals("/index.html") || path.equals("/manifest.json")) return false;
        for (String prefix : RESERVED_PREFIXES) {
            if (path.equals(prefix) || path.startsWith(prefix + "/")) return false;
        }

        // Has a file extension (js/css/png/ico/...) — leave it to the static resource handler,
        // which already 404s a missing asset on its own.
        String lastSegment = path.substring(path.lastIndexOf('/') + 1);
        return !lastSegment.contains(".");
    }
}
