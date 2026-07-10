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

    public static final List<AchievementDefinition> THEME_ACHIEVEMENTS = List.of(
            new AchievementDefinition("favorites_25", "count", 25, "theme", "ocean"),
            new AchievementDefinition("authors_10", "distinct_authors", 10, "theme", "forest"),
            new AchievementDefinition("explorer", "action_set", 5, "theme", "cosmos"),
            new AchievementDefinition("week_streak", "active_days", 7, "theme", "sunset")
    );

    /**
     * Ascending threshold order — doubles as prestige rank for auto-equip.
     */
    public static final List<AchievementDefinition> BADGE_ACHIEVEMENTS = List.of(
            new AchievementDefinition(BADGE_NOVICE, "count", 1, "badge", "novice"),
            new AchievementDefinition(BADGE_CHRONICLER, "active_days", 7, "badge", "chronicler"),
            new AchievementDefinition(BADGE_COLLECTOR, "active_days", 21, "badge", "collector"),
            new AchievementDefinition(BADGE_BIBLIOPHILE, "active_days", 45, "badge", "bibliophile"),
            new AchievementDefinition(BADGE_KEEPER, "active_days", 90, "badge", "keeper"),
            new AchievementDefinition(BADGE_INTERPRETER, "active_days", 180, "badge", "interpreter"),
            new AchievementDefinition(BADGE_ARCHIVIST, "active_days", 365, "badge", "archivist"),
            new AchievementDefinition(BADGE_MENTOR, "active_days", 730, "badge", "mentor"),
            new AchievementDefinition(BADGE_SAGE, "active_days", 1460, "badge", "sage")
    );

    public static final List<AchievementDefinition> ALL = List.of(
            THEME_ACHIEVEMENTS.get(0), THEME_ACHIEVEMENTS.get(1), THEME_ACHIEVEMENTS.get(2), THEME_ACHIEVEMENTS.get(3),
            BADGE_ACHIEVEMENTS.get(0), BADGE_ACHIEVEMENTS.get(1), BADGE_ACHIEVEMENTS.get(2), BADGE_ACHIEVEMENTS.get(3),
            BADGE_ACHIEVEMENTS.get(4), BADGE_ACHIEVEMENTS.get(5), BADGE_ACHIEVEMENTS.get(6), BADGE_ACHIEVEMENTS.get(7),
            BADGE_ACHIEVEMENTS.get(8)
    );

    private AchievementCatalog() {
    }
}
