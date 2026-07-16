package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.push.PushSubscriptionDto;
import com.mkrasikoff.epigraph.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    private final PushNotificationService pushService;

    /**
     * Public — needed before auth to init subscription
     */
    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {

        return ResponseEntity.ok(Map.of("publicKey", pushService.getVapidPublicKey()));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@RequestBody PushSubscriptionDto dto, @AuthenticationPrincipal Long userId) {
        pushService.saveSubscription(userId, dto);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody Map<String, String> body, @AuthenticationPrincipal Long userId) {
        pushService.deleteSubscription(userId, body.get("endpoint"));

        return ResponseEntity.ok().build();
    }

    @PutMapping("/interval")
    public ResponseEntity<Void> updateInterval(@RequestBody Map<String, Integer> body, @AuthenticationPrincipal Long userId) {
        pushService.updateInterval(userId, body.get("intervalHours"));

        return ResponseEntity.ok().build();
    }
}
