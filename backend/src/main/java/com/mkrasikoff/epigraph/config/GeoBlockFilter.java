package com.mkrasikoff.epigraph.config;

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

    private final GeoIpService geoIpService;

    @Value("${app.geo.enabled}")
    private boolean enabled;

    @Value("${app.geo.blocked-countries}")
    private List<String> blockedCountries;

    public GeoBlockFilter(GeoIpService geoIpService) {
        this.geoIpService = geoIpService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (enabled) {
            String uri = request.getRequestURI();
            String ip = request.getRemoteAddr();
            String country = geoIpService.getCountryCode(ip);

            // Google — block for RU
            if (uri.equals("/oauth2/authorization/google")) {
                if (country != null && blockedCountries.contains(country)) {
                    response.sendRedirect("/?error=geo_blocked");
                    return;
                }
            }

            // Yandex — block for every region, except RU
            if (uri.equals("/oauth2/authorization/yandex")) {
                if (country == null || !blockedCountries.contains(country)) {
                    response.sendRedirect("/?error=geo_blocked_yandex");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
