package com.mkrasikoff.epigraph.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class BannerController {

    @Value("${app.banner.message:}")
    private String bannerMessage;

    @GetMapping("/banner")
    public Map<String, String> getBanner() {
        return Map.of("message", bannerMessage != null ? bannerMessage.trim() : "");
    }
}
