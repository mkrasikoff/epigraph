package com.mkrasikoff.epigraph.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * One entry in GET /api/achievements/me. Display text (title/description)
 * resolves client-side from {@code key} via achievements.js — this only
 * carries condition/progress/reward data.
 */
@Data
@AllArgsConstructor
public class AchievementStatusResponse {

    private String key;
    private String conditionType;
    private int threshold;
    private int progress;
    private boolean unlocked;
    private Long unlockedAt;
    private String rewardType;
    private String rewardKey;
}
