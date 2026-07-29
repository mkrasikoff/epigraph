package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.geo.RequestCountryResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final RequestCountryResolver countryResolver;

    public GeoController(RequestCountryResolver countryResolver) {
        this.countryResolver = countryResolver;
    }

    @GetMapping
    public Map<String, String> getGeo(HttpServletRequest request) {
        String country = countryResolver.resolveCountry(request);

        return Map.of("country", country != null ? country : "");
    }
}
