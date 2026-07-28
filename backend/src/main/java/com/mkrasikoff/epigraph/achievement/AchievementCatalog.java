package com.mkrasikoff.epigraph.achievement;

import java.util.List;

/**
 * Fixed catalog of achievements (TASK-122) — a plain constant list, same
 * spirit as AVATAR_ICON_KEYS/THEME_STYLE_KEYS on the frontend: a closed set
 * lives in code, not in a database table.
 *
 * Two independent reward tracks:
 * - 4 "theme" achievements, each a distinct condition unlocking one of the
 *   non-classic theme styles from TASK-119. Applied manually by the user
 *   (never auto-equipped) via the existing theme picker.
 * - 9 "badge" achievements forming a single linear tenure ladder. Unlike
 *   themes, badges auto-equip to the highest-unlocked one — see
 *   AchievementService.reequipBadge(). BADGE_NOVICE is the only one keyed
 *   off a one-off action rather than a day count; the rest must stay listed
 *   in ascending threshold order since that order doubles as prestige rank.
 */
public final class AchievementCatalog {

    public static final String BADGE_NOVICE = "badge_novice";
    public static final String BADGE_CHRONICLER = "badge_chronicler";
    public static final String BADGE_COLLECTOR = "badge_collector";
    public static final String BADGE_BIBLIOPHILE = "badge_bibliophile";
    public static final String BADGE_KEEPER = "badge_keeper";
    public static final String BADGE_INTERPRETER = "badge_interpreter";
    public static final String BADGE_ARCHIVIST = "badge_archivist";
    public static final String BADGE_MENTOR = "badge_mentor";
    public static final String BADGE_SAGE = "badge_sage";

    /**
     * Keys keep their original numeric suffix ("favorites_25", "authors_10")
     * even though the threshold below has since changed — renaming the key
     * would orphan already-earned achievement_progress rows for existing
     * users, so only the threshold/display text change, never the key.
     *
     * "week_streak" is the one genuinely consecutive-day condition in the
     * catalog (TASK-124) — unlike the "active_days" badge ladder below,
     * which counts total distinct days ever active regardless of gaps, this
     * one requires 7 days in a row (AchievementService.currentStreak()).
     * Its progress number can go back down after a missed day; the unlock
     * itself, once reached, is still permanent like every other achievement.
     */
    public static final List<AchievementDefinition> THEME_ACHIEVEMENTS = List.of(
            new AchievementDefinition("favorites_25", "count", 50, "theme", "ocean"),
            new AchievementDefinition("authors_10", "distinct_authors", 15, "theme", "forest"),
            new AchievementDefinition("explorer", "action_set", 5, "theme", "cosmos"),
            new AchievementDefinition("week_streak", "consecutive_days", 7, "theme", "sunset")
    );

    /**
     * Ascending threshold order — doubles as prestige rank for auto-equip.
     */
    public static final List<AchievementDefinition> BADGE_ACHIEVEMENTS = List.of(
            new AchievementDefinition(BADGE_NOVICE, "count", 1, "badge", "novice"),
            new AchievementDefinition(BADGE_CHRONICLER, "active_days", 5, "badge", "chronicler"),
            new AchievementDefinition(BADGE_COLLECTOR, "active_days", 15, "badge", "collector"),
            new AchievementDefinition(BADGE_BIBLIOPHILE, "active_days", 30, "badge", "bibliophile"),
            new AchievementDefinition(BADGE_KEEPER, "active_days", 60, "badge", "keeper"),
            new AchievementDefinition(BADGE_INTERPRETER, "active_days", 100, "badge", "interpreter"),
            new AchievementDefinition(BADGE_ARCHIVIST, "active_days", 250, "badge", "archivist"),
            new AchievementDefinition(BADGE_MENTOR, "active_days", 500, "badge", "mentor"),
            new AchievementDefinition(BADGE_SAGE, "active_days", 1000, "badge", "sage")
    );

    /**
     * A third reward track (TASK-137): each unlocks a stat card on the statistics
     * screen's "Открываются при росте коллекции" section instead of a theme or badge.
     * rewardType "stat" is inert to reequipBadge()/isRewardUnlocked() (those filter by
     * "badge"/"theme"), so a stat reward is never auto-equipped or applied — the card
     * just reads the achievement's unlockedAt. Both count manually-added content only,
     * matching the anti-import-gaming rule the count/distinct badges already follow.
     * rewardKey is the STATS_CARDS id the achievement gates.
     */
    public static final List<AchievementDefinition> STAT_ACHIEVEMENTS = List.of(
            new AchievementDefinition("quotes_50", "count", 50, "stat", "character"),
            new AchievementDefinition("quote_days_10", "quote_days", 10, "stat", "rhythm")
    );

    public static final List<AchievementDefinition> ALL = List.of(
            THEME_ACHIEVEMENTS.get(0), THEME_ACHIEVEMENTS.get(1), THEME_ACHIEVEMENTS.get(2), THEME_ACHIEVEMENTS.get(3),
            BADGE_ACHIEVEMENTS.get(0), BADGE_ACHIEVEMENTS.get(1), BADGE_ACHIEVEMENTS.get(2), BADGE_ACHIEVEMENTS.get(3),
            BADGE_ACHIEVEMENTS.get(4), BADGE_ACHIEVEMENTS.get(5), BADGE_ACHIEVEMENTS.get(6), BADGE_ACHIEVEMENTS.get(7),
            BADGE_ACHIEVEMENTS.get(8),
            STAT_ACHIEVEMENTS.get(0), STAT_ACHIEVEMENTS.get(1)
    );

    private AchievementCatalog() {
    }
}
