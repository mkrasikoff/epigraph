package com.mkrasikoff.epigraph.config;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class GeoIpService {

    private final RestClient restClient = RestClient.create();

    public String getCountryCode(String ip) {
        try {
            Map response = restClient.get()
                    .uri("http://ip-api.com/json/" + ip + "?fields=countryCode")
                    .retrieve()
                    .body(Map.class);
            return response != null ? (String) response.get("countryCode") : null;
        } catch (Exception e) {
            return null;
        }
    }
}
