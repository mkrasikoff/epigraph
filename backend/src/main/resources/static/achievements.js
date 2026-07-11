/**
 * achievements.js — Achievement/badge catalog mirror for Epigraph (TASK-122).
 *
 * The real catalog (conditions, thresholds, rewards) lives server-side in
 * AchievementCatalog.java — GET /api/achievements/me is the source of truth
 * for progress/unlock state. This module only holds *display* metadata
 * (title/description i18n keys, icon markup) keyed by the same achievement
 * keys the backend uses, plus the badge prestige order needed to style the
 * rank pill (see updateSettingsAccount() in auth.js).
 *
 * Depends on:
 * - (none) — pure data module, load before auth.js/ui.js.
 *
 * Provides (globals):
 * - ACHIEVEMENT_KEYS      {string[]} — display order, mirrors AchievementCatalog.ALL
 * - ACHIEVEMENT_META      {Object}   — key -> { titleKey, descKey, icon }
 * - BADGE_REWARD_ORDER    {string[]} — badge reward keys in ascending prestige order
 * - achievementTitleKey(key)/achievementDescKey(key) {fn} — i18n key lookups
 * - badgeLabelKey(rewardKey) {fn}    — i18n key for a badge's display name
 */

const ACHIEVEMENT_KEYS = [
    'favorites_25', 'authors_10', 'explorer', 'week_streak',
    'badge_novice', 'badge_chronicler', 'badge_collector', 'badge_bibliophile',
    'badge_keeper', 'badge_interpreter', 'badge_archivist', 'badge_mentor', 'badge_sage'
];

const BADGE_REWARD_ORDER = [
    'novice', 'chronicler', 'collector', 'bibliophile',
    'keeper', 'interpreter', 'archivist', 'mentor', 'sage'
];

/**
 * Theme style key -> the achievement key that unlocks it. Used by the
 * theme-style picker (ui.js) to look up the condition hint shown under a
 * locked card.
 */
const THEME_REWARD_ACHIEVEMENT = {
    ocean: 'favorites_25',
    forest: 'authors_10',
    cosmos: 'explorer',
    sunset: 'week_streak'
};

const ACHIEVEMENT_META = {
    favorites_25: {
        titleKey: 'achievementFavorites25Title',
        descKey: 'achievementFavorites25Desc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>'
    },
    authors_10: {
        titleKey: 'achievementAuthors10Title',
        descKey: 'achievementAuthors10Desc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    },
    explorer: {
        titleKey: 'achievementExplorerTitle',
        descKey: 'achievementExplorerDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>'
    },
    week_streak: {
        titleKey: 'achievementWeekStreakTitle',
        descKey: 'achievementWeekStreakDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
    },
    // Badge icons (novice -> sage) are one evolving glyph — a book that
    // opens, gains page-line detail and picks up a stacked-page edge (for
    // "volume") as rank increases — rather than 9 unrelated icons from
    // different families, so prestige reads from the shape itself, not just
    // the name. Every icon shares the same viewBox (0 0 24 24) and a
    // centered spine at x=12, so the book silhouette never drifts off-center
    // even as its rendered size grows with rank (badgeIconTierClass() in
    // this file supplies the matching background/border/glow per rank —
    // see achievement-icon-r0..r8 in styles.css). fill="currentColor" so it
    // stays legible against any theme's icon-circle background.
    badge_novice: {
        titleKey: 'badgeNoviceTitle',
        descKey: 'badgeNoviceDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="5" width="6" height="14" rx="1"/></svg>'
    },
    badge_chronicler: {
        titleKey: 'badgeChroniclerTitle',
        descKey: 'badgeChroniclerDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 4.3l8-1.2 1 14.6L9 19z"/></svg>'
    },
    badge_collector: {
        titleKey: 'badgeCollectorTitle',
        descKey: 'badgeCollectorDesc',
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/></svg>'
    },
    badge_bibliophile: {
        titleKey: 'badgeBibliophileTitle',
        descKey: 'badgeBibliophileDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/></svg>'
    },
    badge_keeper: {
        titleKey: 'badgeKeeperTitle',
        descKey: 'badgeKeeperDesc',
        icon: '<svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/></svg>'
    },
    badge_interpreter: {
        titleKey: 'badgeInterpreterTitle',
        descKey: 'badgeInterpreterDesc',
        icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 17.5c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/><path d="M6 8.5c1.2-.6 2.6-.7 3.8-.3M13.5 8.2c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/></svg>'
    },
    badge_archivist: {
        titleKey: 'badgeArchivistTitle',
        descKey: 'badgeArchivistDesc',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 17.5c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M4.5 18.7c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.37"/><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/><path d="M6 8.5c1.2-.6 2.6-.7 3.8-.3M13.5 8.2c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 12.8c1.2-.6 2.6-.7 3.8-.3M13.5 12.5c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/></svg>'
    },
    badge_mentor: {
        titleKey: 'badgeMentorTitle',
        descKey: 'badgeMentorDesc',
        icon: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 17.5c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M4.5 18.7c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.37"/><path d="M4.5 19.9c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.29"/><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/><path d="M6 8.5c1.2-.6 2.6-.7 3.8-.3M13.5 8.2c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 11.3c1.2-.6 2.6-.7 3.8-.3M13.5 11c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 14.2c1.2-.6 2.6-.7 3.8-.3M13.5 13.9c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/></svg>'
    },
    badge_sage: {
        titleKey: 'badgeSageTitle',
        descKey: 'badgeSageDesc',
        icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 17.5c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.45"/><path d="M4.5 18.7c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.37"/><path d="M4.5 19.9c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.29"/><path d="M4.5 21.1c2.2-.8 4.8-1 7.5-.4 2.7-.6 5.3-.4 7.5.4" stroke="currentColor" stroke-width="1" fill="none" opacity="0.21"/><path d="M12 6.4c-2.3-1.5-5.6-2-8-1.4v13c2.4-.6 5.7-.1 8 1.4z"/><path d="M12 6.4c2.3-1.5 5.6-2 8-1.4v13c-2.4-.6-5.7-.1-8 1.4z"/><path d="M12 6.4v13.4" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/><path d="M6 8.5c1.2-.6 2.6-.7 3.8-.3M13.5 8.2c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 10.6c1.2-.6 2.6-.7 3.8-.3M13.5 10.3c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 12.8c1.2-.6 2.6-.7 3.8-.3M13.5 12.5c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/><path d="M6 14.9c1.2-.6 2.6-.7 3.8-.3M13.5 14.6c1.2-.4 2.6-.3 3.8.3" stroke="#000" stroke-opacity="0.45" stroke-width="0.85" fill="none" stroke-linecap="round"/></svg>'
    }
};

/**
 * @param {string} key
 * @returns {string}
 */
function achievementTitleKey(key) {
    return ACHIEVEMENT_META[key]?.titleKey || key;
}

/**
 * @param {string} key
 * @returns {string}
 */
function achievementDescKey(key) {
    return ACHIEVEMENT_META[key]?.descKey || key;
}

/**
 * Returns the i18n key for a badge's display name from its reward key
 * (e.g. 'chronicler' -> 'badgeChroniclerTitle'). Reuses the same title key
 * as the achievement card since the badge *is* the reward.
 * @param {string} rewardKey
 * @returns {string}
 */
function badgeLabelKey(rewardKey) {
    const achievementKey = 'badge_' + rewardKey;
    return achievementTitleKey(achievementKey);
}

/**
 * Returns the CSS modifier class for a badge icon circle's prestige rank —
 * one class per badge (.achievement-icon-r0 .. r8 in styles.css), each a
 * darker-to-lighter step built from that theme's own --color-primary/
 * --color-surface-2 via color-mix(), so it stays theme-safe with no extra
 * CSS per theme style. The last 3 ranks (archivist/mentor/sage) also pick
 * up a dashed outer ring, and the top rank (sage) a glow, purely from this
 * class — see the r6/r7/r8 rules.
 * @param {string} rewardKey
 * @returns {string}
 */
function badgeIconTierClass(rewardKey) {
    const rank = BADGE_REWARD_ORDER.indexOf(rewardKey);
    if (rank < 0) return '';
    return 'achievement-icon-r' + rank;
}
