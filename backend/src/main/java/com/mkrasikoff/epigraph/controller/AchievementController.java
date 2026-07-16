package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.achievement.AchievementStatusResponse;
import com.mkrasikoff.epigraph.service.AchievementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    /**
     * Records the "change_theme" action for "explorer" from the light/dark
     * appearance toggle — not from PATCH /api/user/me/theme (theme *style*),
     * which every brand-new user can't reach: every non-classic style is
     * itself locked behind an achievement, and switching classic-to-classic
     * never calls that endpoint at all. The light/dark toggle is free and
     * always available, so it's a reachable "explorer" action instead. Takes
     * no body/params — a fixed, narrow endpoint that only ever records this
     * one action key, not a generic client-dictated achievement-action API.
     */
    @PostMapping("/appearance-toggle")
    public ResponseEntity<Void> recordAppearanceToggle(@AuthenticationPrincipal Long userId) {
        achievementService.recordAction(userId, "change_theme");
        achievementService.markActiveToday(userId);

        return ResponseEntity.ok().build();
    }
}
