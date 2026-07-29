package com.mkrasikoff.epigraph.geo;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Resolves the visitor's country code from an incoming request.
 * <p>
 * Since TASK-134 the app sits behind Cloudflare (the origin was unreachable from Russia on its
 * bare Railway edge IP). That changes what {@code request.getRemoteAddr()} returns: it's now
 * Cloudflare's edge IP, not the visitor's — so the old "getRemoteAddr() -&gt; ip-api.com lookup"
 * would geolocate every visitor to whatever Cloudflare colo they hit, breaking the OAuth geo
 * gating (see {@link GeoBlockFilter} and {@code GeoController}).
 * <p>
 * Cloudflare already computes the country for us and passes it in the {@code CF-IPCountry} header
 * (IP Geolocation is enabled on the zone), so that's the primary source — it also spares us the
 * synchronous call to ip-api.com. We fall back to a real ip-api lookup only when that header is
 * absent or non-conclusive (local dev with no proxy, or Cloudflare's own "unknown"/"Tor"
 * sentinels), reading the true client IP from {@code CF-Connecting-IP} / {@code X-Forwarded-For}
 * rather than {@code getRemoteAddr()}.
 */
@Component
public class RequestCountryResolver {

    private final GeoIpService geoIpService;

    public RequestCountryResolver(GeoIpService geoIpService) {
        this.geoIpService = geoIpService;
    }

    /**
     * @return the visitor's ISO-3166-1 alpha-2 country code (upper case), or {@code null} when it
     * can't be determined. Callers treat {@code null} the same way they did before this change.
     */
    public String resolveCountry(HttpServletRequest request) {
        String cfCountry = request.getHeader("CF-IPCountry");
        // Cloudflare uses "XX" for unknown and "T1" for Tor — treat those as "not conclusive"
        // and fall through to a real lookup rather than trusting them as a country.
        if (cfCountry != null && cfCountry.length() == 2
                && !cfCountry.equalsIgnoreCase("XX") && !cfCountry.equalsIgnoreCase("T1")) {
            return cfCountry.toUpperCase();
        }
        return geoIpService.getCountryCode(clientIp(request));
    }

    /**
     * The visitor's real IP: Cloudflare's {@code CF-Connecting-IP} first, then the first hop of
     * {@code X-Forwarded-For}, then {@code getRemoteAddr()} for a direct (proxy-less) connection.
     */
    private String clientIp(HttpServletRequest request) {
        String cfConnectingIp = request.getHeader("CF-Connecting-IP");
        if (cfConnectingIp != null && !cfConnectingIp.isBlank()) {
            return cfConnectingIp.trim();
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
