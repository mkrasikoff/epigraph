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

// =============================================================================
// ACHIEVEMENTS — UI
// Badge pill, unlock toast/modal, the achievements modal (focused + full list),
// info tooltips, and applying a theme reward. Moved here from auth.js (TASK-127).
// =============================================================================
/**
 * Cached response of the last GET /api/achievements/me call — reused by the
 * settings-item progress summary, the badge pill, and the theme-picker lock
 * overlays so opening Settings only fetches achievements once, not per UI
 * piece that needs them.
 */
let achievementStatuses = null;

/**
 * Fetches achievement status (once per Settings visit) and refreshes every
 * UI piece that depends on it. Fire-and-forget from updateSettingsAccount()
 * — never called from app bootstrap, and never for guests.
 */
async function refreshAchievementsUi() {
    if (isGuest || !currentUser) return;

    try {
        achievementStatuses = await Api.getAchievements();
    } catch (e) {
        return;
    }

    applyAchievementStatusesToUi();
}

/**
 * Refreshes the summary line, badge pill, and theme-grid lock overlays from
 * the current achievementStatuses cache — shared by refreshAchievementsUi()
 * and checkForNewAchievements() so both update the same set of UI pieces.
 */
function applyAchievementStatusesToUi() {
    if (!achievementStatuses) return;

    const summaryEl = document.getElementById('settings-achievements-summary');
    if (summaryEl) {
        const unlocked = achievementStatuses.filter(a => a.unlocked).length;
        summaryEl.textContent = t('achievementsSummary', {unlocked, total: achievementStatuses.length});
    }

    renderBadgePill();
    updateThemeStyleGrid();
}

/**
 * Returns equipped-badge pill markup for *any* user, not just the signed-in
 * one — the friends screen and a friend's profile (TASK-129) render someone
 * else's badge, so they can't use renderBadgePill()'s single fixed element.
 * Returns '' for a user who hasn't unlocked a badge yet.
 * @param {string} [badgeKey]
 * @returns {string}
 */
function badgePillMarkup(badgeKey) {
    const rank = badgeKey ? BADGE_REWARD_ORDER.indexOf(badgeKey) : -1;
    if (rank === -1) return '';

    return `<span class="badge-pill badge-pill--r${rank}">${escHtml(t(badgeLabelKey(badgeKey)))}</span>`;
}

/**
 * Renders the equipped-badge pill next to the username using the rank
 * (index into BADGE_REWARD_ORDER) to pick one of 9 saturation levels
 * (.badge-pill--r0 .. --r8, see styles.css). Hidden entirely until the
 * user has unlocked "Новичок".
 */
function renderBadgePill() {
    const el = document.getElementById('settings-account-badge');
    if (!el) return;

    const badgeKey = currentUser?.equippedBadge;
    const rank = badgeKey ? BADGE_REWARD_ORDER.indexOf(badgeKey) : -1;

    if (rank === -1) {
        el.style.display = 'none';
        return;
    }

    el.className = 'badge-pill badge-pill--r' + rank;
    el.textContent = t(badgeLabelKey(badgeKey));
    el.style.display = '';
}

/**
 * Re-fetches achievement status after an action that could plausibly unlock
 * something (quote added/favorited/imported, profile edited, theme
 * changed) and diffs it against the previous cache to find anything newly
 * unlocked. Fire-and-forget from those actions' own success handlers —
 * never awaited, never blocks the action's own toast/UI update.
 *
 * Silently does nothing on the very first call in a session (achievementStatuses
 * still null) — there's nothing to diff against yet, and treating "just
 * loaded the real state for the first time" as "everything unlocked just now"
 * would flood a returning user with celebration modals for old progress.
 */
async function checkForNewAchievements() {
    if (isGuest || !currentUser) return;

    const previous = achievementStatuses;
    let fresh;
    try {
        fresh = await Api.getAchievements();
    } catch (e) {
        return;
    }

    achievementStatuses = fresh;
    applyAchievementStatusesToUi();

    if (!previous) return;

    const previouslyUnlocked = new Set(previous.filter(a => a.unlocked).map(a => a.key));
    const newlyUnlocked = fresh.filter(a => a.unlocked && !previouslyUnlocked.has(a.key));
    if (!newlyUnlocked.length) return;

    // Badges auto-equip server-side — refetch so equippedBadge/themeStyle are current.
    try {
        currentUser = await Api.getMe();
    } catch (e) {
    }
    renderBadgePill();

    showAchievementUnlockModal(newlyUnlocked[0]);
}

/**
 * Celebrates a single newly-unlocked achievement. If the shared modal is
 * already showing something else (e.g. the bulk-import summary), defers to
 * a toast instead of stealing that modal out from under it — achievements
 * are auxiliary, not worth interrupting a primary flow for.
 * @param {Object} status - One entry from GET /api/achievements/me.
 */
function showAchievementUnlockModal(status) {
    if (document.getElementById('modal')?.classList.contains('open')) {
        toast(t('achievementUnlockedToast', {title: t(achievementTitleKey(status.key))}));
        return;
    }

    const meta = ACHIEVEMENT_META[status.key] || {};
    const actions = [{label: t('achievementUnlockedLaterBtn'), cls: 'btn-secondary', action: closeModal}];
    let rewardText = '';

    if (status.rewardType === 'theme') {
        const themeName = t(themeStyleLabelKey(status.rewardKey));
        rewardText = t('achievementUnlockedRewardTheme', {theme: themeName});
        actions.unshift({
            label: t('achievementsApplyThemeBtn'),
            cls: 'btn-primary',
            action: () => applyAchievementTheme(status.rewardKey)
        });
    } else if (status.rewardType === 'badge') {
        const badgeName = t(badgeLabelKey(status.rewardKey));
        rewardText = t('achievementUnlockedRewardBadge', {badge: badgeName});
    }

    const rewardIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
    const iconTier = status.rewardType === 'badge' ? badgeIconTierClass(status.rewardKey) : '';

    const body = `
        <p class="achievement-unlock-heading">${t('achievementUnlockedHeading')}</p>
        <div class="achievement-unlock-icon-wrap">
            <div class="achievement-unlock-icon ${iconTier}">${meta.icon || ''}</div>
        </div>
        <p class="achievement-unlock-title">${t(achievementTitleKey(status.key))}</p>
        <p class="achievement-unlock-desc">${t(achievementDescKey(status.key))}</p>
        ${rewardText ? `<div class="achievement-unlock-reward-box">${rewardIcon}<span>${rewardText}</span></div>` : ''}
    `;

    // Title passed as '' hides the shared #modal-title heading (see showModal
    // docs) — we render our own centered one in the body instead, and
    // centered=true also centers the footer buttons (default is right-aligned).
    showModal('', body, actions, false, true);
}

/**
 * Opens the achievements modal — the sole entry point for the feature, only
 * fetching from the server if refreshAchievementsUi() (called when Settings
 * opens) hasn't already populated the cache. Guests never reach this: the
 * settings-item that triggers it lives inside #settings-account-group,
 * which is hidden for guests, and switchView() itself already blocks guests
 * from entering the Settings view at all.
 */
async function showAchievementsModal() {
    if (!achievementStatuses) {
        try {
            achievementStatuses = await Api.getAchievements();
        } catch (e) {
            toast(t('authErrorConnection'));
            return;
        }
    }

    renderFocusedAchievementsModal();
}

/**
 * Default achievements view — only the current/next badge and the 2 locked
 * theme achievements closest to completion, not the full 13-item catalog.
 * "Показать все" swaps to renderAllAchievementsModal() for anyone who wants
 * to browse the whole thing.
 */
function renderFocusedAchievementsModal() {
    const statuses = achievementStatuses || [];
    const unlockedCount = statuses.filter(a => a.unlocked).length;

    const badges = statuses.filter(a => a.rewardType === 'badge');
    const currentBadgeIndex = badges.reduce((acc, a, i) => a.unlocked ? i : acc, -1);
    const currentBadge = currentBadgeIndex >= 0 ? badges[currentBadgeIndex] : null;
    const nextBadge = badges[currentBadgeIndex + 1] || null;

    const nearestThemes = statuses
        .filter(a => a.rewardType === 'theme' && !a.unlocked)
        .sort((a, b) => (b.progress / b.threshold) - (a.progress / a.threshold))
        .slice(0, 2);

    let badgeCardHtml = '';
    if (nextBadge) {
        const pct = nextBadge.threshold ? Math.min(100, Math.round((nextBadge.progress / nextBadge.threshold) * 100)) : 0;
        const currentIcon = currentBadge ? (ACHIEVEMENT_META[currentBadge.key]?.icon || '') : '';
        const nextIcon = ACHIEVEMENT_META[nextBadge.key]?.icon || '';
        const currentTier = currentBadge ? badgeIconTierClass(currentBadge.rewardKey) : '';
        const nextTier = badgeIconTierClass(nextBadge.rewardKey);

        badgeCardHtml = `
            <div class="achievement-focus-card">
                <div class="achievement-focus-top">
                    <div class="achievement-focus-side">
                        <div class="achievement-focus-icon ${currentTier}">${currentIcon}</div>
                        <div>
                            <div class="achievement-focus-label">${t('achievementsCurrentBadge')}</div>
                            <div class="achievement-focus-name">${currentBadge ? t(achievementTitleKey(currentBadge.key)) : t('achievementsCurrentBadgeEmpty')}</div>
                        </div>
                    </div>
                    <div class="achievement-focus-side achievement-focus-side--right">
                        <div>
                            <div class="achievement-focus-label">${t('achievementsNextBadge')}</div>
                            <div class="achievement-focus-name">${t(achievementTitleKey(nextBadge.key))}</div>
                        </div>
                        <div class="achievement-focus-icon achievement-focus-icon--muted ${nextTier}">${nextIcon}</div>
                    </div>
                </div>
                <div class="achievement-focus-progress-track"><div class="achievement-focus-progress-fill" style="width:${pct}%"></div></div>
                <div class="achievement-focus-fraction">${nextBadge.progress}/${nextBadge.threshold}</div>
            </div>
        `;
    }

    const body = `
        <p class="achievements-focus-summary">${t('achievementsSummary', {unlocked: unlockedCount, total: statuses.length})}</p>
        ${badgeCardHtml}
        ${nearestThemes.length ? `<div class="settings-group-title">${t('achievementsNearestThemesSection')}</div>
        <div class="achievements-list">${nearestThemes.map(renderNearestThemeRow).join('')}</div>` : ''}
        <button type="button" class="achievements-expand-btn" onclick="renderAllAchievementsModal()">${t('achievementsShowAllBtn', {total: statuses.length})}</button>
    `;

    showModal(t('settingsAchievementsTitle'), body, [], true);
}

/**
 * Compact "condition + reward" line for a row — e.g. "50 избранных ·
 * тема «Океан»" for theme achievements, or just the condition for badges
 * (the badge itself already *is* the reward, so restating it would be
 * redundant clutter).
 * @param {Object} a - One entry from GET /api/achievements/me.
 * @returns {string}
 */
function achievementConditionWithReward(a) {
    const desc = t(achievementDescKey(a.key));
    if (a.rewardType !== 'theme') return desc;

    return `${desc} · ${t(themeStyleLabelKey(a.rewardKey))}`;
}

function renderNearestThemeRow(a) {
    const meta = ACHIEVEMENT_META[a.key] || {};
    const pct = a.threshold ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;

    return `<div class="achievement-row">
                <div class="achievement-row-icon">${meta.icon || ''}</div>
                <div class="achievement-row-body">
                    <span class="achievement-row-title">${t(achievementTitleKey(a.key))}</span>
                    <div class="achievement-row-condition">${achievementConditionWithReward(a)}</div>
                    <div class="achievement-row-progress-track"><div class="achievement-row-progress-fill" style="width:${pct}%"></div></div>
                </div>
                <span class="achievement-row-status achievement-row-fraction">${a.progress}/${a.threshold}</span>
            </div>`;
}

/**
 * Full catalog view (all 13), grouped by reward type — themes and badges
 * are two distinct reward tracks (see AchievementCatalog), and the badge
 * group is a literal prestige ladder, so it reads better as one ordered
 * list than split across unlocked/in-progress sections.
 */
function renderAllAchievementsModal() {
    const statuses = achievementStatuses || [];
    const unlockedCount = statuses.filter(a => a.unlocked).length;
    const pct = statuses.length ? Math.round((unlockedCount / statuses.length) * 100) : 0;

    const themes = statuses.filter(a => a.rewardType === 'theme');
    const badges = statuses.filter(a => a.rewardType === 'badge');

    const renderRow = (a) => {
        const meta = ACHIEVEMENT_META[a.key] || {};
        const title = t(achievementTitleKey(a.key));
        const desc = achievementConditionWithReward(a);
        const iconTier = a.rewardType === 'badge' ? badgeIconTierClass(a.rewardKey) : '';

        // Only "Начитанность" (distinct-authors count) is gated on manuallyAdded quotes —
        // imported-via-link quotes don't move it, unlike favorites. That's non-obvious enough
        // to call out right on the row rather than as a general disclaimer nobody reads.
        const infoHtml = a.key === 'authors_10' ? `
            <button type="button" class="achievement-info-btn" data-achievement-info-toggle aria-label="${t('ariaAchievementInfo')}" aria-expanded="false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
            <div class="achievement-info-tooltip" role="tooltip">${t('achievementsImportHint')}</div>
        ` : '';

        let statusHtml;
        let progressHtml = '';

        if (a.unlocked) {
            if (a.rewardType === 'theme' && currentUser?.themeStyle !== a.rewardKey) {
                statusHtml = `<button type="button" class="achievement-row-apply-btn" onclick="applyAchievementTheme('${a.rewardKey}')">${t('achievementsApplyThemeBtn')}</button>`;
            } else {
                statusHtml = `<span class="achievement-row-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;
            }
        } else {
            statusHtml = `<span class="achievement-row-fraction">${a.progress}/${a.threshold}</span>`;
            const progressPct = a.threshold ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;
            progressHtml = `<div class="achievement-row-progress-track"><div class="achievement-row-progress-fill" style="width:${progressPct}%"></div></div>`;
        }

        return `<div class="achievement-row${a.unlocked ? ' achievement-row--unlocked' : ''}">
                    <div class="achievement-row-icon ${iconTier}">${meta.icon || ''}</div>
                    <div class="achievement-row-body">
                        <span class="achievement-row-title-wrap">
                            <span class="achievement-row-title">${title}</span>
                            ${infoHtml}
                        </span>
                        <div class="achievement-row-condition">${desc}</div>
                        ${progressHtml}
                    </div>
                    <div class="achievement-row-status">${statusHtml}</div>
                </div>`;
    };

    const body = `
        <div class="achievements-summary-bar"><div class="achievements-summary-fill" style="width:${pct}%"></div></div>
        <div class="settings-group-title">${t('achievementsThemesSection')}</div>
        <div class="achievements-list">${themes.map(renderRow).join('')}</div>
        <div class="settings-group-title">${t('achievementsBadgesSection')}</div>
        <div class="achievements-list">${badges.map(renderRow).join('')}</div>
        <button type="button" class="achievements-expand-btn" onclick="renderFocusedAchievementsModal()">${t('achievementsBackBtn')}</button>
    `;

    showModal(t('settingsAchievementsTitle'), body, [], true);
    initAchievementInfoTooltips();
}

/**
 * Wires up click-to-toggle for the small info icons rendered next to
 * achievement rows that need a disclaimer (currently just authors_10 — see
 * renderAllAchievementsModal()). Called after every render since showModal()
 * replaces the modal body's innerHTML each time, so previous listeners (and
 * their elements) are already gone — no accumulation risk. The click-outside/
 * Escape-to-close handling is registered once at module load, below.
 */
function initAchievementInfoTooltips() {
    document.querySelectorAll('[data-achievement-info-toggle]').forEach(btn => {
        const tooltip = btn.nextElementSibling;
        if (!tooltip || !tooltip.classList.contains('achievement-info-tooltip')) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const opening = !tooltip.classList.contains('visible');
            document.querySelectorAll('.achievement-info-tooltip.visible').forEach(t => t.classList.remove('visible'));
            tooltip.classList.toggle('visible', opening);
            btn.setAttribute('aria-expanded', String(opening));
        });
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.achievement-info-tooltip.visible').forEach(t => t.classList.remove('visible'));
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.achievement-info-tooltip.visible').forEach(t => t.classList.remove('visible'));
    }
});

/**
 * Applies an unlocked theme achievement's reward from inside the
 * achievements modal — the theme-reward "manual apply" path (unlike badges,
 * which auto-equip server-side). Mirrors the theme-picker click handler in
 * ui.js so both paths stay in sync.
 * @param {string} themeKey - One of THEME_STYLE_KEYS.
 */
async function applyAchievementTheme(themeKey) {
    try {
        const res = await Api.updateThemeStyle(themeKey);

        if (!res.ok) {
            toast(t('achievementsThemeErrorToast'));
            return;
        }

        document.documentElement.setAttribute('data-theme-style', themeKey);
        try {
            localStorage.setItem('themeStyle', themeKey);
        } catch (e) {
        }

        if (currentUser) currentUser.themeStyle = themeKey;
        updateThemeStyleGrid();
        toast(t('achievementsThemeAppliedToast'));
        closeModal();
        checkForNewAchievements();
    } catch (e) {
        toast(t('achievementsThemeErrorToast'));
    }
}
