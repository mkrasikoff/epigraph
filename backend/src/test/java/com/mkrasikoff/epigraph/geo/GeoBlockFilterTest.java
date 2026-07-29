package com.mkrasikoff.epigraph.geo;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The filter's contract: gate only the two OAuth entry points, and decide the visitor's country
 * via {@link RequestCountryResolver} (which reads Cloudflare's CF-IPCountry header — see that
 * class for why getRemoteAddr() is no longer used). Google is blocked for RU, Yandex for everyone
 * except RU.
 */
@ExtendWith(MockitoExtension.class)
class GeoBlockFilterTest {

    @Mock private RequestCountryResolver countryResolver;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;

    private GeoBlockFilter filter(boolean enabled) {
        GeoBlockFilter filter = new GeoBlockFilter(countryResolver);
        ReflectionTestUtils.setField(filter, "enabled", enabled);
        ReflectionTestUtils.setField(filter, "blockedCountries", List.of("RU"));
        return filter;
    }

    @Test
    @DisplayName("Google OAuth from a blocked country (RU) is redirected, chain not continued")
    void googleBlockedForRu() throws Exception {
        when(request.getRequestURI()).thenReturn("/oauth2/authorization/google");
        when(countryResolver.resolveCountry(request)).thenReturn("RU");

        filter(true).doFilterInternal(request, response, filterChain);

        verify(response).sendRedirect("/?error=geo_blocked");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Google OAuth from an allowed country passes through")
    void googleAllowedElsewhere() throws Exception {
        when(request.getRequestURI()).thenReturn("/oauth2/authorization/google");
        when(countryResolver.resolveCountry(request)).thenReturn("US");

        filter(true).doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).sendRedirect(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("Yandex OAuth from RU is allowed (Yandex is the RU-only path)")
    void yandexAllowedForRu() throws Exception {
        when(request.getRequestURI()).thenReturn("/oauth2/authorization/yandex");
        when(countryResolver.resolveCountry(request)).thenReturn("RU");

        filter(true).doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(response, never()).sendRedirect(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("Yandex OAuth from a non-RU country is redirected")
    void yandexBlockedElsewhere() throws Exception {
        when(request.getRequestURI()).thenReturn("/oauth2/authorization/yandex");
        when(countryResolver.resolveCountry(request)).thenReturn("US");

        filter(true).doFilterInternal(request, response, filterChain);

        verify(response).sendRedirect("/?error=geo_blocked_yandex");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Yandex OAuth with an unknown country is redirected (fails closed)")
    void yandexBlockedWhenCountryUnknown() throws Exception {
        when(request.getRequestURI()).thenReturn("/oauth2/authorization/yandex");
        when(countryResolver.resolveCountry(request)).thenReturn(null);

        filter(true).doFilterInternal(request, response, filterChain);

        verify(response).sendRedirect("/?error=geo_blocked_yandex");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Non-OAuth requests are never geo-resolved and always pass through")
    void nonOAuthRequestPassesThroughWithoutLookup() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/quotes");

        filter(true).doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(countryResolver);
    }

    @Test
    @DisplayName("When geo gating is disabled, nothing is resolved and everything passes")
    void disabledSkipsEverything() throws Exception {
        filter(false).doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(countryResolver);
    }
}
