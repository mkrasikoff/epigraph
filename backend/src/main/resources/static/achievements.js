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
    badge_novice: {
        titleKey: 'badgeNoviceTitle',
        descKey: 'badgeNoviceDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
    },
    badge_chronicler: {
        titleKey: 'badgeChroniclerTitle',
        descKey: 'badgeChroniclerDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
    },
    badge_collector: {
        titleKey: 'badgeCollectorTitle',
        descKey: 'badgeCollectorDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'
    },
    badge_bibliophile: {
        titleKey: 'badgeBibliophileTitle',
        descKey: 'badgeBibliophileDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
    },
    badge_keeper: {
        titleKey: 'badgeKeeperTitle',
        descKey: 'badgeKeeperDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
    },
    badge_interpreter: {
        titleKey: 'badgeInterpreterTitle',
        descKey: 'badgeInterpreterDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
    },
    badge_archivist: {
        titleKey: 'badgeArchivistTitle',
        descKey: 'badgeArchivistDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/></svg>'
    },
    badge_mentor: {
        titleKey: 'badgeMentorTitle',
        descKey: 'badgeMentorDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
    },
    badge_sage: {
        titleKey: 'badgeSageTitle',
        descKey: 'badgeSageDesc',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>'
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
