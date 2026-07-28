package com.mkrasikoff.epigraph.achievement;

/**
 * A single catalog entry — display metadata (title/icon/etc.) lives on the
 * frontend, keyed off {@code key}; this only carries what the backend needs
 * to evaluate and report the condition.
 *
 * @param key           unique, matches the row's achievement_key in achievement_progress
 * @param conditionType how the frontend should render progress: "count", "distinct_authors",
 *                      "active_days", "action_set", "consecutive_days" or "quote_days"
 * @param threshold     the value progress must reach to unlock
 * @param rewardType    "theme", "badge" or "stat" (a statistics card unlock)
 * @param rewardKey     the theme style key, badge key, or STATS_CARDS id granted on unlock
 */
public record AchievementDefinition(
        String key,
        String conditionType,
        int threshold,
        String rewardType,
        String rewardKey
) {
}
