package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.AchievementStatusResponse;
import com.mkrasikoff.epigraph.service.AchievementService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Lazily called only when the user opens the Achievements screen in
 * Settings — never from app bootstrap/page load (see AchievementService).
 */
@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService achievementService;

    public AchievementController(AchievementService achievementService) {
        this.achievementService = achievementService;
    }

    @GetMapping("/me")
    public List<AchievementStatusResponse> me(@AuthenticationPrincipal Long userId) {
        return achievementService.getStatusForUser(userId);
    }
}
