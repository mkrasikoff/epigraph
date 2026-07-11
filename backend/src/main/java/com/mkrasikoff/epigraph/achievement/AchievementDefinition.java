package com.mkrasikoff.epigraph.achievement;

/**
 * A single catalog entry — display metadata (title/icon/etc.) lives on the
 * frontend, keyed off {@code key}; this only carries what the backend needs
 * to evaluate and report the condition.
 *
 * @param key           unique, matches the row's achievement_key in achievement_progress
 * @param conditionType how the frontend should render progress: "count", "distinct_authors",
 *                      "active_days", "action_set" or "consecutive_days"
 * @param threshold     the value progress must reach to unlock
 * @param rewardType    "theme" or "badge"
 * @param rewardKey     the theme style key or badge key granted on unlock
 */
public record AchievementDefinition(
        String key,
        String conditionType,
        int threshold,
        String rewardType,
        String rewardKey
) {
}
