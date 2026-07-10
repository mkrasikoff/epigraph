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
    // Badge icons (novice -> sage) are one evolving glyph — a book opening
    // wider with more visible pages as rank increases — rather than 9
    // unrelated icons from different families, so prestige reads from the
    // shape itself, not just the name. All single-tone (fill="currentColor",
    // accent lines at reduced opacity) so they stay legible against any
    // theme's badge-pill/icon-circle background, light or dark.
    badge_novice: {
        titleKey: 'badgeNoviceTitle',
        descKey: 'badgeNoviceDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 28" fill="currentColor"><rect x="4" y="2" width="16" height="24" rx="1.5"/></svg>'
    },
    badge_chronicler: {
        titleKey: 'badgeChroniclerTitle',
        descKey: 'badgeChroniclerDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 28" fill="currentColor"><path d="M4 3 L18 1 L20 25 L6 27 Z"/></svg>'
    },
    badge_collector: {
        titleKey: 'badgeCollectorTitle',
        descKey: 'badgeCollectorDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 30 26" fill="currentColor"><path d="M15 5 C11 3 6 2 2 3 V22 C6 21 11 22 15 25 Z"/><path d="M15 5 C19 3 24 2 28 3 V22 C24 21 19 22 15 25 Z"/></svg>'
    },
    badge_bibliophile: {
        titleKey: 'badgeBibliophileTitle',
        descKey: 'badgeBibliophileDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 32 26" fill="currentColor"><path d="M16 5 C11 3 5 2 1 3 V22 C5 21 11 22 16 25 Z"/><path d="M16 5 C21 3 27 2 31 3 V22 C27 21 21 22 16 25 Z"/></svg>'
    },
    badge_keeper: {
        titleKey: 'badgeKeeperTitle',
        descKey: 'badgeKeeperDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 34 27" fill="currentColor"><path d="M17 6 C12 4 6 3 1 4 V23 C6 22 12 23 17 26 Z"/><path d="M17 6 C22 4 28 3 33 4 V23 C28 22 22 23 17 26 Z"/><path d="M5 9 C9 7 13 8 15 10M29 9 C25 7 21 8 19 10" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.4" fill="none"/></svg>'
    },
    badge_interpreter: {
        titleKey: 'badgeInterpreterTitle',
        descKey: 'badgeInterpreterDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 36 28" fill="currentColor"><path d="M18 6 C13 4 7 3 2 4 V24 C7 23 13 24 18 27 Z"/><path d="M18 6 C23 4 29 3 34 4 V24 C29 23 23 24 18 27 Z"/><path d="M6 10 C10 8 14 9 16 11M6 15 C10 13 14 14 16 16M30 10 C26 8 22 9 20 11M30 15 C26 13 22 14 20 16" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.4" fill="none"/></svg>'
    },
    badge_archivist: {
        titleKey: 'badgeArchivistTitle',
        descKey: 'badgeArchivistDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 38 30" fill="currentColor"><path d="M19 7 C13 5 7 4 2 5 V26 C7 25 13 26 19 29 Z"/><path d="M19 7 C25 5 31 4 36 5 V26 C31 25 25 26 19 29 Z"/><path d="M6 11 C11 9 15 10 17 12M6 16 C11 14 15 15 17 17M6 21 C11 19 15 20 17 22M32 11 C27 9 23 10 21 12M32 16 C27 14 23 15 21 17M32 21 C27 19 23 20 21 22" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.4" fill="none"/></svg>'
    },
    badge_mentor: {
        titleKey: 'badgeMentorTitle',
        descKey: 'badgeMentorDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 40 32" fill="currentColor"><path d="M20 7 C13 5 7 4 2 5 V27 C7 26 13 27 20 30 Z"/><path d="M20 7 C27 5 33 4 38 5 V27 C33 26 27 27 20 30 Z"/><path d="M6 11 C12 9 16 10 18 12M6 16 C12 14 16 15 18 17M6 21 C12 19 16 20 18 22M34 11 C28 9 24 10 22 12M34 16 C28 14 24 15 22 17M34 21 C28 19 24 20 22 22" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.4" fill="none"/></svg>'
    },
    badge_sage: {
        titleKey: 'badgeSageTitle',
        descKey: 'badgeSageDesc',
        icon: '<svg width="20" height="20" viewBox="0 0 64 52" fill="currentColor"><path d="M32 10 C24 4 12 2 4 4 V44 C12 42 24 44 32 50 Z"/><path d="M32 10 C40 4 52 2 60 4 V44 C52 42 40 44 32 50 Z"/><rect x="30" y="8" width="4" height="42"/><path d="M10 12 C16 10 22 10 27 13M10 20 C16 18 22 18 27 21M10 28 C16 26 22 26 27 29M54 12 C48 10 42 10 37 13M54 20 C48 18 42 18 37 21M54 28 C48 26 42 26 37 29" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5" fill="none"/></svg>'
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
 * Returns the CSS modifier class for a badge icon circle's prestige tier —
 * ranks 0-2 get a muted outline, 3-5 a filled ring, 6-8 a filled double
 * ring with glow (see .achievement-icon-tier-* in styles.css). Same 3-stage
 * "visual weight" grammar approved for the icons, just applied to the
 * circle instead of hand-picking 9 colors — reuses each theme's own
 * --color-primary/--color-primary-highlight so it stays theme-safe with no
 * extra CSS per theme style.
 * @param {string} rewardKey
 * @returns {string}
 */
function badgeIconTierClass(rewardKey) {
    const rank = BADGE_REWARD_ORDER.indexOf(rewardKey);
    if (rank < 0) return '';
    if (rank <= 2) return 'achievement-icon-tier-1';
    if (rank <= 5) return 'achievement-icon-tier-2';
    return 'achievement-icon-tier-3';
}
