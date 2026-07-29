package com.mkrasikoff.epigraph.geo;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class GeoBlockFilter extends OncePerRequestFilter {

    private final RequestCountryResolver countryResolver;

    @Value("${app.geo.enabled}")
    private boolean enabled;

    @Value("${app.geo.blocked-countries}")
    private List<String> blockedCountries;

    public GeoBlockFilter(RequestCountryResolver countryResolver) {
        this.countryResolver = countryResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (enabled) {
            String uri = request.getRequestURI();
            boolean isGoogleOAuth = uri.equals("/oauth2/authorization/google");
            boolean isYandexOAuth = uri.equals("/oauth2/authorization/yandex");

            // Only the two OAuth entry points need a geo lookup — every other request
            // (including every API call from an already-logged-in session) used to pay for
            // a synchronous call to ip-api.com here regardless of the URI, which is the
            // likely cause of intermittent slow page loads.
            if (isGoogleOAuth || isYandexOAuth) {
                String country = countryResolver.resolveCountry(request);

                // Google — block for RU
                if (isGoogleOAuth && country != null && blockedCountries.contains(country)) {
                    response.sendRedirect("/?error=geo_blocked");
                    return;
                }

                // Yandex — block for every region, except RU
                if (isYandexOAuth && (country == null || !blockedCountries.contains(country))) {
                    response.sendRedirect("/?error=geo_blocked_yandex");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
