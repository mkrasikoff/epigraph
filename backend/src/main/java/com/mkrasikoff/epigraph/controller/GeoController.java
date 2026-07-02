package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.config.GeoIpService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoIpService geoIpService;

    public GeoController(GeoIpService geoIpService) {
        this.geoIpService = geoIpService;
    }

    @GetMapping
    public Map<String, String> getGeo(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        String country = geoIpService.getCountryCode(ip);

        return Map.of("country", country != null ? country : "");
    }
}
