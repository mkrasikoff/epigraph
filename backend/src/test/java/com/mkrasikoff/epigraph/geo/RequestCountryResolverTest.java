package com.mkrasikoff.epigraph.geo;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestCountryResolverTest {

    @Mock private GeoIpService geoIpService;
    @Mock private HttpServletRequest request;

    private RequestCountryResolver resolver() {
        return new RequestCountryResolver(geoIpService);
    }

    @Test
    @DisplayName("Uses the CF-IPCountry header directly and skips the ip-api lookup")
    void usesCloudflareCountryHeader() {
        when(request.getHeader("CF-IPCountry")).thenReturn("RU");

        assertThat(resolver().resolveCountry(request)).isEqualTo("RU");
        verifyNoInteractions(geoIpService);
    }

    @Test
    @DisplayName("Normalises the CF-IPCountry header to upper case")
    void upperCasesCloudflareCountryHeader() {
        when(request.getHeader("CF-IPCountry")).thenReturn("us");

        assertThat(resolver().resolveCountry(request)).isEqualTo("US");
        verifyNoInteractions(geoIpService);
    }

    @Test
    @DisplayName("Falls back to an ip-api lookup on the real client IP when CF-IPCountry is 'XX' (unknown)")
    void fallsBackOnUnknownCloudflareCountry() {
        when(request.getHeader("CF-IPCountry")).thenReturn("XX");
        when(request.getHeader("CF-Connecting-IP")).thenReturn("203.0.113.7");
        when(geoIpService.getCountryCode("203.0.113.7")).thenReturn("DE");

        assertThat(resolver().resolveCountry(request)).isEqualTo("DE");
    }

    @Test
    @DisplayName("Falls back to the 'T1' (Tor) sentinel the same way as unknown")
    void fallsBackOnTorSentinel() {
        when(request.getHeader("CF-IPCountry")).thenReturn("T1");
        when(request.getHeader("CF-Connecting-IP")).thenReturn("203.0.113.7");
        when(geoIpService.getCountryCode("203.0.113.7")).thenReturn("FR");

        assertThat(resolver().resolveCountry(request)).isEqualTo("FR");
    }

    @Test
    @DisplayName("Without the Cloudflare header, uses the first hop of X-Forwarded-For")
    void usesFirstForwardedForHop() {
        when(request.getHeader("CF-IPCountry")).thenReturn(null);
        when(request.getHeader("CF-Connecting-IP")).thenReturn(null);
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.4, 203.0.113.1");
        when(geoIpService.getCountryCode("198.51.100.4")).thenReturn("GB");

        assertThat(resolver().resolveCountry(request)).isEqualTo("GB");
    }

    @Test
    @DisplayName("With no proxy headers at all, falls back to getRemoteAddr() (local/dev)")
    void usesRemoteAddrWhenNoProxyHeaders() {
        when(request.getHeader("CF-IPCountry")).thenReturn(null);
        when(request.getHeader("CF-Connecting-IP")).thenReturn(null);
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(geoIpService.getCountryCode("127.0.0.1")).thenReturn(null);

        assertThat(resolver().resolveCountry(request)).isNull();
        verify(geoIpService).getCountryCode("127.0.0.1");
    }
}
