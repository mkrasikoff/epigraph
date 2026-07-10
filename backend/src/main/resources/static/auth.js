/**
 * auth.js — Authentication state and UI for Epigraph.
 *
 * Depends on:
 * - getGuestQuotes() {fn}       — preset quotes for guest mode, defined in guest-quotes.js
 * - quotes           {Array}    — global mutable quotes array, defined in index.html CONSTANTS
 * - currentQodIndex  {number}   — defined in index.html CONSTANTS
 * - loadData()       {fn}       — defined in api.js
 * - renderQod()      {fn}       — defined in quotes.js
 * - switchView()     {fn}       — defined in index.html NAVIGATION
 * - t()              {fn}       — defined in i18n.js
 * - setLanguage()    {fn}       — defined in i18n.js
 * - TRANSLATIONS     {Object}   — defined in i18n.js
 * - AUTH_API         {string}   — defined in index.html CONSTANTS
 * - AVATAR_SELECT_CLOSE_DELAY_MS {number} — defined in state.js
 * - AUTH_SUCCESS_FLASH_MS {number} — defined in state.js
 * - drawLogoIcon()   {fn}       — defined in ui.js
 */

// Cache the original register form HTML to restore it when user goes back from verify screen
const _registerFormSnapshot = document.getElementById('auth-register-form-col')?.innerHTML;

// =============================================================================
// AUTH STATE
// JWT token stored in localStorage, helpers to read/write/clear it.
// =============================================================================
function getToken() {
    try {
        return localStorage.getItem('epigraph_token');
    } catch (e) {
        return null;
    }
}

function setToken(token) {
    try {
        localStorage.setItem('epigraph_token', token);
    } catch (e) {
    }
}

function clearToken() {
    try {
        localStorage.removeItem('epigraph_token');
    } catch (e) {
    }
}

function authHeaders() {
    const token = getToken();
    return token
        ? {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
        : {'Content-Type': 'application/json'};
}

// =============================================================================
// AUTH UI
// The block responsible for authentication screens, modes, and session flow.
// =============================================================================
let authMode = 'login';
let isGuest = true;

function showAuthModal() {
    document.getElementById('auth-screen').classList.add('visible');
    document.getElementById('app-blur-overlay').classList.add('visible');
    document.body.classList.add('modal-lock-scroll');
}

function hideAuthModal() {
    document.getElementById('auth-screen').classList.remove('visible');
    document.getElementById('app-blur-overlay').classList.remove('visible');
    document.body.classList.remove('modal-lock-scroll');
}

function hideLoadingOverlay() {
    document.getElementById('app-loading-overlay')?.classList.add('hidden');
    drawLogoIcon();
}

function showGuestMode() {
    isGuest = true;
    quotes = getGuestQuotes();
    qodAnchorId = quotes[0]?.id ?? null;

    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('login-btn').style.display = '';
    document.querySelector('[data-lang-toggle]')?.style.removeProperty('display');

    ['list', 'add', 'settings'].forEach(id => {
        document.getElementById('tab-' + id)?.classList.add('guest-locked');
        document.getElementById('btn-fav-qod')?.classList.add('guest-locked');
    });

    const accountGroup = document.getElementById('settings-account-group');

    if (accountGroup) accountGroup.style.display = 'none';

    renderQod();
    hideLoadingOverlay();
}

function hideGuestMode() {
    isGuest = false;

    document.getElementById('logout-btn').style.display = '';
    document.getElementById('login-btn').style.display = 'none';
    document.querySelector('[data-lang-toggle]')?.style.setProperty('display', 'none');

    ['list', 'add', 'settings'].forEach(id => {
        document.getElementById('tab-' + id)?.classList.remove('guest-locked');
        document.getElementById('btn-fav-qod')?.classList.remove('guest-locked');
    });
}

/**
 * Fetches the authenticated user's profile (id, email, username) and caches
 * it in `currentUser` for display in Settings > Account. No-ops to null on
 * failure — callers fall back to placeholder text.
 */
async function loadCurrentUser() {
    try {
        currentUser = await Api.getMe();
    } catch (e) {
        currentUser = null;
    }
}

/**
 * Updates the account section in Settings with the current user's profile
 * (username, id, email) and quote stats. Shows the section for authenticated
 * users, hides for guests.
 */
function updateSettingsAccount() {
    const accountGroup = document.getElementById('settings-account-group');
    if (!accountGroup) return;

    if (isGuest) {
        accountGroup.style.display = 'none';
        return;
    }

    accountGroup.style.display = '';

    const usernameEl = document.getElementById('settings-account-username');
    const idEl = document.getElementById('settings-account-id');
    const emailEl = document.getElementById('settings-account-email');
    const avatarEl = document.getElementById('settings-account-avatar');

    if (avatarEl) avatarEl.innerHTML = avatarIconMarkup(currentUser?.avatarIcon);

    if (currentUser) {
        usernameEl.textContent = '@' + (currentUser.username || ('user' + currentUser.id));
        idEl.textContent = '#' + currentUser.id;
        emailEl.textContent = currentUser.email || '';
    } else {
        usernameEl.textContent = '—';
        idEl.textContent = '';
        emailEl.textContent = '';
    }

    const total = quotes.length;
    const favCount = quotes.filter(q => q.fav).length;

    document.getElementById('settings-account-stats').textContent =
        t('statsSummary', {total, word: quoteCountWord(total), favorites: favCount});

    // Update change-password item — same wording for all users
    document.getElementById('settings-change-password-title').textContent = t('changePasswordTitle');
    document.getElementById('settings-change-password-desc').textContent = t('changePasswordSettingsDesc');
    document.getElementById('settings-change-password-btn-label').textContent = t('changePasswordButton');

    renderBadgePill();
    refreshAchievementsUi();
}

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
    let rewardHtml = '';

    if (status.rewardType === 'theme') {
        const themeName = t(themeStyleLabelKey(status.rewardKey));
        rewardHtml = `<p class="achievement-unlock-reward">${t('achievementUnlockedRewardTheme', {theme: themeName})}</p>`;
        actions.unshift({
            label: t('achievementsApplyThemeBtn', {theme: themeName}),
            cls: 'btn-primary',
            action: () => applyAchievementTheme(status.rewardKey)
        });
    } else if (status.rewardType === 'badge') {
        const badgeName = t(badgeLabelKey(status.rewardKey));
        rewardHtml = `<p class="achievement-unlock-reward">${t('achievementUnlockedRewardBadge', {badge: badgeName})}</p>`;
    }

    const body = `
        <div class="achievement-unlock-icon">${meta.icon || ''}</div>
        <p class="achievement-unlock-title">${t(achievementTitleKey(status.key))}</p>
        <p class="achievement-unlock-desc">${t(achievementDescKey(status.key))}</p>
        ${rewardHtml}
    `;

    showModal(t('achievementUnlockedHeading'), body, actions, false);
}

/**
 * Opens the modal to pick one of the 12 preset avatar icons.
 * Selecting an option applies it immediately — no separate submit step.
 */
function showAvatarPickerModal() {
    const current = currentUser?.avatarIcon || 'neutral';

    const optionsHtml = AVATAR_ICON_KEYS.map(key => {
        const selected = key === current ? ' avatar-picker-option--selected' : '';
        const label = t(avatarIconLabelKey(key));
        return `<div class="avatar-picker-item">
                    <button type="button" class="avatar-picker-option${selected}"
                            aria-label="${label}" onclick="submitAvatarIcon('${key}')">
                        ${avatarIconMarkup(key, 1.8)}
                        <span class="avatar-picker-badge" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                    </button>
                    <span class="avatar-picker-label">${label}</span>
                </div>`;
    }).join('');

    showModal('', `<div class="avatar-picker-grid">${optionsHtml}</div>`, [], true);
}

/**
 * Fires a brief scale-bounce on a just-selected avatar option. The checkmark
 * badge itself is pure CSS (`.avatar-picker-option--selected .avatar-picker-badge`),
 * so this only needs to handle the one-off bounce; callers still toggle the
 * `--selected` class themselves.
 * @param {HTMLElement} [btn] - The avatar option button element.
 */
function bounceAvatarOption(btn) {
    if (!btn) return;

    btn.style.transition = 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    btn.style.transform = 'scale(1.18)';
    setTimeout(() => {
        btn.style.transform = '';
        btn.style.transition = '';
    }, 150);
}

/**
 * Submits the chosen avatar icon to PATCH /api/user/me/avatar.
 * @param {string} key - One of AVATAR_ICON_KEYS.
 */
async function submitAvatarIcon(key) {
    if (currentUser?.avatarIcon === key) {
        closeModal();
        return;
    }

    try {
        const res = await Api.updateAvatar(key);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            toast(data?.message || t('avatarPickerError'));
            return;
        }

        if (currentUser) currentUser.avatarIcon = key;
        updateSettingsAccount();
        checkForNewAchievements();
        toast(t('avatarPickerSuccess'));

        const btn = document.querySelector(`.avatar-picker-option[onclick="submitAvatarIcon('${key}')"]`);
        document.querySelectorAll('.avatar-picker-grid .avatar-picker-option--selected')
            .forEach(b => b.classList.remove('avatar-picker-option--selected'));
        btn?.classList.add('avatar-picker-option--selected');
        bounceAvatarOption(btn);

        setTimeout(closeModal, AVATAR_SELECT_CLOSE_DELAY_MS);
    } catch {
        toast(t('authErrorConnection'));
    }
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

    const unlocked = achievementStatuses.filter(a => a.unlocked);
    const inProgress = achievementStatuses.filter(a => !a.unlocked);
    const pct = achievementStatuses.length ? Math.round((unlocked.length / achievementStatuses.length) * 100) : 0;

    const renderCard = (a, isUnlocked) => {
        const meta = ACHIEVEMENT_META[a.key] || {};
        const title = t(achievementTitleKey(a.key));
        const desc = t(achievementDescKey(a.key));

        let extra = '';
        if (isUnlocked) {
            if (a.rewardType === 'theme' && currentUser?.themeStyle !== a.rewardKey) {
                const themeName = t(themeStyleLabelKey(a.rewardKey));
                extra = `<button type="button" class="achievement-card-apply-btn" onclick="applyAchievementTheme('${a.rewardKey}')">${t('achievementsApplyThemeBtn', {theme: themeName})}</button>`;
            }
        } else {
            const progressPct = a.threshold ? Math.min(100, Math.round((a.progress / a.threshold) * 100)) : 0;
            extra = `<div class="achievement-card-progress-track"><div class="achievement-card-progress-fill" style="width:${progressPct}%"></div></div>`;
        }

        return `<div class="achievement-card${isUnlocked ? ' achievement-card--unlocked' : ''}">
                    <div class="achievement-card-icon">${meta.icon || ''}</div>
                    <div class="achievement-card-title">${title}</div>
                    <div class="achievement-card-desc">${desc}</div>
                    ${extra}
                </div>`;
    };

    const body = `
        <div class="achievements-summary-bar"><div class="achievements-summary-fill" style="width:${pct}%"></div></div>
        ${unlocked.length ? `<div class="settings-group-title">${t('achievementsUnlockedSection')}</div>
        <div class="achievements-grid">${unlocked.map(a => renderCard(a, true)).join('')}</div>` : ''}
        ${inProgress.length ? `<div class="settings-group-title">${t('achievementsInProgressSection')}</div>
        <div class="achievements-grid">${inProgress.map(a => renderCard(a, false)).join('')}</div>` : ''}
    `;

    showModal(t('settingsAchievementsTitle'), body, [], true);
}

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

/**
 * Opens the modal to change the authenticated user's display username.
 */
function showEditUsernameModal() {
    showModal(
        t('editUsernameTitle'),
        `<div class="auth-field" style="margin-bottom:0">
             <label style="font-size:var(--text-sm);color:var(--color-text-muted)">
                 ${t('editUsernameLabel')}
             </label>
             <input id="eu-username" type="text" class="modal-confirm-input"
                    style="margin-top:var(--space-1)"
                    maxlength="20"
                    placeholder="${t('editUsernamePlaceholder')}"
                    value="${currentUser?.username || ''}"
                    autocomplete="off">
         </div>
         <p id="eu-error" style="margin-top:var(--space-3);font-size:var(--text-sm);
         color:#c0392b;min-height:1.2em"></p>`,
        [
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal},
            {
                label: t('changePasswordSubmit'),
                cls: 'btn-primary',
                id: 'eu-submit-btn',
                action: submitEditUsername
            }
        ]
    );

    const input = document.getElementById('eu-username');
    setTimeout(() => input?.focus(), 100);

    input?.addEventListener('input', () => validateUsernameInput(input));
    validateUsernameInput(input);
}

/**
 * Validates the username field live, mirroring the backend's format rules
 * (3–20 chars, latin letters/digits/underscore), and toggles the submit button.
 * @param {HTMLInputElement} input
 * @param {string} [btnId='eu-submit-btn'] - Id of the submit button to enable/disable.
 * @param {string} [errorId='eu-error'] - Id of the element to show the validation message in.
 */
function validateUsernameInput(input, btnId = 'eu-submit-btn', errorId = 'eu-error') {
    const btn = document.getElementById(btnId);
    const errorEl = document.getElementById(errorId);
    if (!btn || !input) return;

    const value = input.value.trim();
    let message = '';

    if (!value) {
        message = t('editUsernameErrorRequired');
    } else if (!USERNAME_REGEX.test(value)) {
        message = (value.length < 3 || value.length > 20)
            ? t('editUsernameErrorLength')
            : t('editUsernameErrorChars');
    }

    if (errorEl) errorEl.textContent = message;
    btn.disabled = !!message;
    btn.classList.toggle('btn-disabled-empty', !!message);
}

/**
 * Submits the new username to PATCH /api/user/me/username.
 */
async function submitEditUsername() {
    const input = document.getElementById('eu-username');
    const errorEl = document.getElementById('eu-error');
    const btn = document.getElementById('eu-submit-btn');
    const username = input?.value.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
        validateUsernameInput(input);
        return;
    }

    if (btn) btn.disabled = true;

    try {
        const res = await Api.updateUsername(username);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            if (errorEl) errorEl.textContent = data?.message || t('editUsernameErrorInvalid');
            return;
        }

        if (currentUser) currentUser.username = username;
        closeModal();
        updateSettingsAccount();
        checkForNewAchievements();
        toast(t('editUsernameSuccess'));

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/** Avatar icon selected so far in the open profile-setup modal (see showProfileSetupModal). */
let profileSetupAvatar = 'neutral';

/**
 * Opens the post-registration profile-setup modal — lets a freshly verified user pick an
 * avatar icon and tweak the auto-generated username (see AuthService.deriveUsername on the
 * backend). Skippable: the account already has a valid default for both, so this is purely
 * optional polish, not a blocking step.
 * @param {string} defaultUsername - The username already saved on the account (pre-fills the field).
 */
function showProfileSetupModal(defaultUsername) {
    profileSetupAvatar = currentUser?.avatarIcon || 'neutral';

    const optionsHtml = AVATAR_ICON_KEYS.map(key => {
        const selected = key === profileSetupAvatar ? ' avatar-picker-option--selected' : '';
        const label = t(avatarIconLabelKey(key));
        return `<div class="avatar-picker-item">
                    <button type="button" class="avatar-picker-option${selected}" id="profile-setup-avatar-${key}"
                            aria-label="${label}" onclick="selectProfileSetupAvatar('${key}')">
                        ${avatarIconMarkup(key, 1.8)}
                        <span class="avatar-picker-badge" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>
                    </button>
                    <span class="avatar-picker-label">${label}</span>
                </div>`;
    }).join('');

    showModal(
        t('profileSetupTitle'),
        `<p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">
             ${t('profileSetupDesc')}
         </p>
         <div class="avatar-picker-grid" id="profile-setup-avatar-grid">${optionsHtml}</div>
         <div class="auth-field" style="margin-top:var(--space-5);margin-bottom:0">
             <label style="font-size:var(--text-sm);color:var(--color-text-muted)">
                 ${t('authUsernameLabel')}
             </label>
             <input id="profile-setup-username" type="text" class="modal-confirm-input"
                    style="margin-top:var(--space-1)"
                    maxlength="20"
                    placeholder="${t('authUsernamePlaceholder')}"
                    value="${escHtml(defaultUsername || '')}"
                    autocomplete="off">
         </div>
         <p id="profile-setup-error" style="margin-top:var(--space-3);font-size:var(--text-sm);
         color:#c0392b;min-height:1.2em"></p>`,
        [
            {label: t('profileSetupSkip'), cls: 'btn-secondary', action: closeModal},
            {
                label: t('changePasswordSubmit'),
                cls: 'btn-primary',
                id: 'profile-setup-save-btn',
                action: submitProfileSetup
            }
        ],
        true
    );

    const input = document.getElementById('profile-setup-username');
    input?.addEventListener('input', () => validateUsernameInput(input, 'profile-setup-save-btn', 'profile-setup-error'));
}

/**
 * Selects an avatar icon within the open profile-setup modal (local selection only —
 * applied together with the username on Save, unlike the standalone avatar picker in
 * Settings which applies on click).
 * @param {string} key - One of AVATAR_ICON_KEYS.
 */
function selectProfileSetupAvatar(key) {
    profileSetupAvatar = key;

    document.querySelectorAll('#profile-setup-avatar-grid .avatar-picker-option').forEach(btn => {
        btn.classList.remove('avatar-picker-option--selected');
    });

    const btn = document.getElementById('profile-setup-avatar-' + key);
    btn?.classList.add('avatar-picker-option--selected');
    bounceAvatarOption(btn);
}

/**
 * Saves the chosen username/avatar from the profile-setup modal — only sends the PATCH
 * requests for whichever of the two actually changed from the account's current values.
 */
async function submitProfileSetup() {
    const input = document.getElementById('profile-setup-username');
    const errorEl = document.getElementById('profile-setup-error');
    const btn = document.getElementById('profile-setup-save-btn');
    const username = input?.value.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
        validateUsernameInput(input, 'profile-setup-save-btn', 'profile-setup-error');
        return;
    }

    if (btn) btn.disabled = true;

    try {
        if (username !== currentUser?.username) {
            const res = await Api.updateUsername(username);
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                if (errorEl) errorEl.textContent = data?.message || t('editUsernameErrorInvalid');
                return;
            }
            if (currentUser) currentUser.username = username;
        }

        if (profileSetupAvatar !== (currentUser?.avatarIcon || 'neutral')) {
            const res = await Api.updateAvatar(profileSetupAvatar);
            if (res.ok && currentUser) currentUser.avatarIcon = profileSetupAvatar;
        }

        closeModal();
        updateSettingsAccount();

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * Reconciles the app's active language with the authenticated user's account
 * right after login/register/reset. If this device already has an explicit
 * language choice (the guest picked one, or it was set on a previous
 * session), that choice wins and is pushed to the account — this is how a
 * language picked on the guest screen "sticks" through registration/login
 * instead of being silently overwritten by whatever the account had stored.
 * Otherwise (a fresh device with no local choice), the account's stored
 * preference is pulled down and applied locally.
 */
async function syncPreferredLanguage() {
    if (!currentUser) return;

    let explicit = null;
    try {
        explicit = localStorage.getItem('epigraph_lang');
    } catch (e) {
    }

    const serverLang = currentUser.preferredLanguage;

    if (explicit && TRANSLATIONS[explicit] && explicit !== serverLang) {
        try {
            await Api.updatePreferredLanguage(explicit);
            currentUser.preferredLanguage = explicit;
        } catch (e) {
        }
    } else if (!explicit && serverLang) {
        setLanguage(serverLang);
    }
}

/**
 * Reconciles the app's active theme style with the authenticated user's
 * account right after login/register/reset — same "guest choice wins" shape
 * as syncPreferredLanguage() above, applied to the theme-style picker
 * instead of the language toggle. No page reload needed here since a style
 * switch is a pure CSS variable swap, not a text-reflow change.
 */
async function syncPreferredTheme() {
    if (!currentUser) return;

    let explicit = null;
    try {
        explicit = localStorage.getItem('themeStyle');
    } catch (e) {
    }

    const serverStyle = currentUser.themeStyle;

    if (explicit && THEME_STYLE_KEYS.includes(explicit) && explicit !== serverStyle) {
        try {
            await Api.updateThemeStyle(explicit);
            currentUser.themeStyle = explicit;
        } catch (e) {
        }
    } else if (!explicit && serverStyle) {
        document.documentElement.setAttribute('data-theme-style', serverStyle);
        try {
            localStorage.setItem('themeStyle', serverStyle);
        } catch (e) {
        }
        updateThemeStyleGrid();
    }
}

/**
 * Fetches the latest release tag from GitHub and displays it as the app version.
 * Caches the result in sessionStorage to avoid redundant API calls within the same session.
 */
async function loadAppVersion() {
    const badge = document.getElementById('settings-version-badge');

    if (!badge) return;

    const cached = sessionStorage.getItem('epigraph_version');

    if (cached) {
        badge.textContent = cached;
        return;
    }

    try {
        const response = await fetch('https://api.github.com/repos/mkrasikoff/epigraph/releases/latest');

        if (!response.ok) throw new Error('Failed to fetch release');

        const data = await response.json();
        const version = data.tag_name || 'v—';
        sessionStorage.setItem('epigraph_version', version);
        badge.textContent = version;
    } catch {
        badge.textContent = 'v—';
    }
}

// ── Banner ──────────────────────────────────────────────────────────
async function loadBanner() {
    try {
        const res = await fetch('/api/banner');
        if (!res.ok) return;
        const data = await res.json();
        const msg = data.message?.trim();
        if (!msg) return;

        // Don't show again if dismissed in this session
        const dismissed = sessionStorage.getItem('banner-dismissed');
        if (dismissed === msg) return;

        const banner = document.getElementById('announcement-banner');
        const text   = document.getElementById('announcement-banner-text');
        if (!banner || !text) return;

        text.textContent = msg;
        banner.style.display = 'flex';
    } catch (e) {}
}

function dismissBanner() {
    const banner = document.getElementById('announcement-banner');
    const text   = document.getElementById('announcement-banner-text');
    if (!banner) return;

    // Remember this specific message was dismissed
    if (text?.textContent) {
        sessionStorage.setItem('banner-dismissed', text.textContent);
    }

    banner.style.transition = 'opacity 200ms ease, transform 200ms ease';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-6px)';
    setTimeout(() => banner.style.display = 'none', 210);
}

// =============================================================================
// QUOTE OF THE DAY LOADER
// Fetches QoD from the backend and caches the result in sessionStorage
// to avoid redundant API calls within the same session.
// =============================================================================
/**
 * Loads the Quote of the Day from the backend, using sessionStorage cache
 * to avoid redundant requests within the same browser session.
 * Falls back to renderQod(null) if the request fails.
 */
async function loadQod() {
    const CACHE_KEY = 'epigraph_qod_id';

    try {
        const cachedId = sessionStorage.getItem(CACHE_KEY);
        if (cachedId !== null) {
            const quote = quotes.find(q => q.id === Number(cachedId));
            if (quote) {
                qodAnchorId = quote.id;
                renderQod(quote);
                return;
            }
            // Cached id no longer matches a local quote (deleted/edited since caching) —
            // fall through to a fresh fetch instead of rendering with no anchor at all,
            // which used to permanently strip the "Today" tab highlight for the rest of
            // the session once the cache went stale.
        }
    } catch { /* corrupted cache — proceed to fetch */ }

    try {
        const qodQuote = await Api.getQod();
        if (qodQuote) {
            sessionStorage.setItem(CACHE_KEY, String(qodQuote.id));
        }
        qodAnchorId = qodQuote ? qodQuote.id : null;
        renderQod(qodQuote);
    } catch {
        qodAnchorId = null;
        renderQod(null);
    }
}

// =============================================================================
// HASH ROUTING
// Syncs browser URL hash with the active view and handles back/forward navigation.
// Supported hashes: #today, #all, #add, #settings
// =============================================================================
/** Maps URL hashes to view identifiers. */
const HASH_TO_VIEW = {
    '#today':    'qod',
    '#all':      'list',
    '#add':      'add',
    '#settings': 'settings',
};

/**
 * Returns the view id for the current window.location.hash,
 * falling back to 'qod' for unknown or empty hashes.
 * @returns {string}
 */
function getViewFromHash() {
    return HASH_TO_VIEW[window.location.hash] || 'qod';
}

/**
 * Navigates to the view matching the current URL hash.
 * Called on hashchange (back/forward) and on initial load.
 */
function applyHashRoute() {
    switchView(getViewFromHash());
}

// Handle browser back / forward buttons
window.addEventListener('hashchange', applyHashRoute);

function toggleAuthMode() {
    if (document.getElementById('auth-forgot-panel')) {
        hideForgotPasswordForm();
    }

    authMode = authMode === 'login' ? 'register' : 'login';
    const isRegister = authMode === 'register';

    document.getElementById('auth-submit-btn').textContent = isRegister ? t('authSubmitRegister') : t('authSubmitLogin');
    document.getElementById('auth-switch-text').textContent = isRegister ? t('authSwitchToLogin') : t('authSwitchToRegister');
    document.querySelector('#auth-screen .auth-switch button').textContent = isRegister ? t('authSwitchBtnLogin') : t('authSwitchBtnRegister');
    document.getElementById('auth-error').textContent = '';

    const card = document.querySelector('.auth-card');
    card.classList.toggle('auth-card--register', isRegister);

    const loginHeader = document.getElementById('auth-login-header');
    const registerPanel = document.getElementById('auth-register-panel');
    const registerFormCol = document.getElementById('auth-register-form-col');
    const subtitle = document.getElementById('auth-subtitle');

    if (loginHeader) loginHeader.style.display = isRegister ? 'none' : '';
    if (registerPanel) registerPanel.style.display = isRegister ? '' : 'none';
    if (registerFormCol) registerFormCol.style.display = isRegister ? '' : 'none';
    if (subtitle) subtitle.style.display = isRegister ? 'none' : '';

    if (!isRegister) {
        const regEmail = document.getElementById('auth-email-reg')?.value.trim();
        if (regEmail) document.getElementById('auth-email').value = regEmail;
    }
}

async function authSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit-btn');
    errorEl.textContent = '';

    if (!email || !password) {
        errorEl.textContent = t('authErrorFillAllFields');
        return;
    }

    if (!EMAIL_REGEX_STRICT.test(email)) {
        errorEl.textContent = t('authErrorInvalidEmail');
        return;
    }

    if (authMode === 'register') {
        if (password.length < 8) {
            errorEl.textContent = t('authErrorPasswordTooShort');
            return;
        }
        if (password.length > 128) {
            errorEl.textContent = t('authErrorPasswordTooLong');
            return;
        }
        if (!/[A-Za-z]/.test(password)) {
            errorEl.textContent = t('authErrorPasswordNoLetter');
            return;
        }
        if (!/[0-9]/.test(password)) {
            errorEl.textContent = t('authErrorPasswordNoDigit');
            return;
        }
    }

    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-spinner-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${t('authLoading')}`;

    const endpoint = authMode === 'login' ? '/login' : '/register';

    try {
        const res = await fetch(AUTH_API + endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password})
        });

        const data = await res.json();

        if (!res.ok) {
            if (data.password) {
                errorEl.textContent = data.password;
                return;
            }

            if (data.email) {
                errorEl.textContent = t('authErrorInvalidEmailServer');
                return;
            }

            errorEl.textContent = data.message || t('authErrorWrongCredentials');

            return;
        }

        setToken(data.token);
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ${t('authLoading')}`;
        await new Promise(resolve => setTimeout(resolve, AUTH_SUCCESS_FLASH_MS));

        hideAuthModal();
        hideGuestMode();
        await loadData();
        await loadCurrentUser();
        await syncPreferredLanguage();
        await syncPreferredTheme();
        renderQod();

    } catch (e) {
        errorEl.textContent = t('authErrorConnection');
    } finally {
        btn.disabled = false;
        btn.textContent = authMode === 'register' ? t('authSubmitRegister') : t('authSubmitLogin');
    }
}

/**
 * Handles registration form submission from the two-column register layout.
 */
async function authSubmitRegister() {
    const email = document.getElementById('auth-email-reg')?.value.trim() || '';
    const password = document.getElementById('auth-password-reg')?.value || '';
    const errorEl = document.getElementById('auth-error-reg');

    if (!EMAIL_REGEX.test(email)) {
        if (errorEl) errorEl.textContent = t('authErrorInvalidEmailDot');
        return;
    }

    if (!PASSWORD_REGEX.test(password)) {
        if (errorEl) errorEl.textContent = t('authErrorPasswordPattern');
        return;
    }

    if (errorEl) errorEl.textContent = '';

    document.getElementById('auth-email').value = email;
    document.getElementById('auth-password').value = password;
    authMode = 'register';

    // Call /register — on success (202) backend sent a code, show verification screen
    const btn = document.getElementById('auth-submit-btn-reg');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-spinner-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${t('authLoading')}`;
    }

    try {
        const res = await fetch(AUTH_API + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = res.status === 202 ? null : await res.json().catch(() => null);

        if (!res.ok) {
            if (errorEl) errorEl.textContent = data?.message || t('authErrorWrongCredentials');
            return;
        }

        // Show the verification code input screen
        showVerifyScreen(email);

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = t('authSubmitRegister'); }
    }
}

function loginWithGoogle() {
    window.location.href = '/oauth2/authorization/google';
}

function loginWithYandex() {
    window.location.href = '/oauth2/authorization/yandex';
}

/**
 * Shows/hides the Google vs. Yandex OAuth buttons for the given region guess.
 * @param {boolean} isRussia
 */
function applyAuthButtonVisibility(isRussia) {
    document.querySelectorAll('.btn-google').forEach(btn => {
        btn.style.display = isRussia ? 'none' : '';
    });
    document.querySelectorAll('.btn-yandex').forEach(btn => {
        btn.style.display = isRussia ? '' : 'none';
    });
}

async function initAuthButtons() {
    // Both buttons start hidden in the HTML — apply an instant, zero-latency best guess
    // from the browser locale first so they don't flash empty while /api/geo (an external
    // IP lookup) resolves, then correct it below once the accurate answer is in. The actual
    // region gate for the OAuth flow itself is enforced server-side (GeoBlockFilter)
    // regardless of which button was visible, so a brief mismatch here is only cosmetic.
    applyAuthButtonVisibility(/^ru\b/i.test(navigator.language || ''));

    try {
        const res = await fetch('/api/geo');
        const data = await res.json();
        applyAuthButtonVisibility(data.country === 'RU');
    } catch (e) {
        // On error — show all OAuth buttons
        document.querySelectorAll('.btn-google, .btn-yandex').forEach(btn => {
            btn.style.display = '';
        });
    }
}

function logout() {
    clearToken();
    currentUser = null;
    showGuestMode();
    switchView('qod');
}

function handleAuthOverlayClick(e) {
    if (e.target === document.getElementById('auth-screen')) hideAuthModal();
}

/**
 * Shows the email verification screen after successful registration request.
 * @param {string} email - The email address the code was sent to.
 */
function showVerifyScreen(email) {
    const container = document.getElementById('auth-register-form-col');
    if (!container) return;

    container.innerHTML = `
        <button onclick="showRegisterForm()" type="button" class="auth-back-btn auth-back-btn--inset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            ${t('verifyBack')}
        </button>
        <div class="auth-register-top">
            <h2 class="auth-register-heading">${t('verifyTitle')}</h2>
            <p class="auth-register-sub">${t('verifySubtitle', { email })}</p>
        </div>
        <div class="auth-field">
            <label for="verify-code-input">${t('verifyCodeLabel')}</label>
            <input id="verify-code-input" class="auth-input" type="text"
                   inputmode="numeric" maxlength="6" placeholder="000000"
                   autocomplete="one-time-code"
                   class="form-input verify-code-input">
        </div>
        <p class="auth-error" id="verify-error"></p>
        <button class="btn-primary" id="verify-submit-btn" onclick="submitVerifyCode('${email}')">
            ${t('verifySubmit')}
        </button>
        <p class="auth-switch">
            <span>${t('verifyResendHint')}</span>
            <button onclick="resendVerifyCode('${email}')">${t('verifyResendLink')}</button>
        </p>
    `;

    setTimeout(() => document.getElementById('verify-code-input')?.focus(), 100);
}

/**
 * Restores the registration form from the original HTML snapshot.
 * Used when the user clicks "Back" on the verify screen.
 */
function showRegisterForm() {
    const container = document.getElementById('auth-register-form-col');

    if (!container || !_registerFormSnapshot) return;

    container.innerHTML = _registerFormSnapshot;
}

/**
 * Submits the verification code to /api/auth/verify.
 * On success, logs the user in and closes the auth modal.
 * @param {string} email
 */
async function submitVerifyCode(email) {
    const codeInput = document.getElementById('verify-code-input');
    const errorEl = document.getElementById('verify-error');
    const btn = document.getElementById('verify-submit-btn');
    const code = codeInput?.value.trim();

    if (!code || code.length !== 6) {
        if (errorEl) errorEl.textContent = t('verifyErrorInvalidCode');
        return;
    }

    if (errorEl) errorEl.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = t('authLoading'); }

    try {
        const res = await fetch(AUTH_API + '/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            if (errorEl) errorEl.textContent = data?.message || t('verifyErrorInvalidCode');
            return;
        }

        // Registration complete — log the user in
        sessionStorage.removeItem('epigraph_qod_id'); // clear any stale guest cache
        setToken(data.token);
        hideAuthModal();
        hideGuestMode();
        await loadData();
        await loadCurrentUser();
        await syncPreferredLanguage();
        await syncPreferredTheme();
        await loadQod();
        showProfileSetupModal(currentUser?.username || '');

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = t('verifySubmit'); }
    }
}

/**
 * Re-sends the verification code for the given email.
 * @param {string} email
 */
async function resendVerifyCode(email) {
    const errorEl = document.getElementById('verify-error');

    try {
        const res = await fetch(AUTH_API + '/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (errorEl) {
            errorEl.style.color = res.ok ? 'var(--color-accent)' : 'var(--color-error)';
            errorEl.textContent = res.ok ? t('verifyResendSuccess') : t('verifyResendError');
        }
    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    }
}

/**
 * Replaces the login form with a "forgot password" email input.
 */
function showForgotPasswordForm() {
    // Hide login-mode elements — scoped strictly to the login form, not the register panel
    document.getElementById('auth-login-header')?.style.setProperty('display', 'none');
    document.getElementById('auth-subtitle').style.display = 'none';
    document.querySelector('#auth-screen .auth-switch').style.display = 'none';
    document.getElementById('auth-forgot-btn').style.display = 'none';

    // The login form elements sit directly inside .auth-card (not inside auth-register-form-col)
    // Select them by ID to avoid accidentally touching the register panel
    const loginOnlyIds = ['auth-email', 'auth-password', 'auth-error', 'auth-submit-btn'];
    loginOnlyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.dataset.forgotHidden = 'true'; el.style.display = 'none'; }
    });

    // Also hide the wrapping .auth-field divs that contain the login inputs
    // (they are direct children of .auth-card, not inside auth-register-form-col)
    document.querySelectorAll('#auth-screen > div.auth-card > .auth-field').forEach(el => {
        el.dataset.forgotHidden = 'true';
        el.style.display = 'none';
    });

    // Hide divider and Google button that belong to the login column
    ['auth-divider', 'btn-google'].forEach(cls => {
        // Only the direct-child ones, not those inside auth-register-form-col
        const card = document.querySelector('#auth-screen .auth-card');
        card.querySelectorAll(':scope > .auth-divider, :scope > .btn-google').forEach(el => {
            el.dataset.forgotHidden = 'true';
            el.style.display = 'none';
        });
    });

    // Inject the forgot-password panel
    const panel = document.createElement('div');
    panel.id = 'auth-forgot-panel';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = 'var(--space-5)';
    panel.innerHTML = `
        <button onclick="hideForgotPasswordForm()"
                style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);color:var(--color-text-muted);background:none;border:none;cursor:pointer;padding:0;"
                onmouseover="this.style.color='var(--color-text)'"
                onmouseout="this.style.color='var(--color-text-muted)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            ${t('forgotPasswordBack')}
        </button>
        <div>
            <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-1)">${t('forgotPasswordTitle')}</h2>
            <p style="font-size:var(--text-sm);color:var(--color-text-muted)">${t('forgotPasswordDesc')}</p>
        </div>
        <div class="auth-field">
            <label for="forgot-email-input">${t('forgotPasswordEmailLabel')}</label>
            <input id="forgot-email-input" class="auth-input" type="email"
                   placeholder="you@example.com" autocomplete="email">
        </div>
        <p id="forgot-error" class="auth-error"></p>
        <button class="btn-primary" id="forgot-submit-btn" onclick="submitForgotPassword()">
            ${t('forgotPasswordSubmit')}
        </button>
    `;

    // Append after the login header, before the login fields
    const card = document.querySelector('#auth-screen .auth-card');
    const loginHeader = document.getElementById('auth-login-header');
    // Insert after auth-login-header (or at the top of card if header not found)
    if (loginHeader && loginHeader.nextSibling) {
        card.insertBefore(panel, loginHeader.nextSibling);
    } else {
        card.prepend(panel);
    }

    setTimeout(() => document.getElementById('forgot-email-input')?.focus(), 100);
}

/**
 * Restores the login form after "Забыли пароль?" panel is dismissed.
 */
function hideForgotPasswordForm() {
    document.getElementById('auth-forgot-panel')?.remove();

    document.querySelectorAll('[data-forgot-hidden="true"]').forEach(el => {
        el.style.display = '';
        delete el.dataset.forgotHidden;
    });

    document.getElementById('auth-login-header')?.style.removeProperty('display');
    document.getElementById('auth-subtitle').style.removeProperty('display');
    document.querySelector('#auth-screen .auth-switch')?.style.removeProperty('display');
    document.getElementById('auth-forgot-btn').style.removeProperty('display');
}

/**
 * Sends a password-reset email request to the backend.
 */
async function submitForgotPassword() {
    const emailInput = document.getElementById('forgot-email-input');
    const errorEl = document.getElementById('forgot-error');
    const btn = document.getElementById('forgot-submit-btn');
    const email = emailInput?.value.trim();

    if (!EMAIL_REGEX.test(email)) {
        errorEl.textContent = t('authErrorInvalidEmail');
        return;
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-spinner-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${t('authLoading')}`;

    try {
        // Always returns 202 regardless of whether email exists — no enumeration
        await fetch(AUTH_API + '/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        // Show success state regardless of actual result
        errorEl.style.color = 'var(--color-accent)';
        errorEl.textContent = t('forgotPasswordSuccessHint');
        btn.style.display = 'none';
        emailInput.disabled = true;

    } catch {
        errorEl.style.color = '';
        errorEl.textContent = t('authErrorConnection');
    } finally {
        btn.disabled = false;
        btn.textContent = t('forgotPasswordSubmit');
    }
}

/**
 * Checks for a password-reset token in the URL query string.
 * If found, navigates to Settings and opens the change-password modal.
 * Called during app init, after the user is authenticated via the reset token.
 */
async function handleResetTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset');
    if (!resetToken) return false;

    // Clean up the URL immediately
    window.history.replaceState({}, document.title, window.location.hash || '/');

    // Show a modal to collect the new password, then POST to /api/user/reset-password
    showModal(
        t('changePasswordTitle'),
        `<div class="auth-field" style="margin-bottom:var(--space-3)">
             <label style="font-size:var(--text-sm);color:var(--color-text-muted)">
                 ${t('changePasswordNew')}
             </label>
             <input id="cp-new" type="password" class="modal-confirm-input"
                    style="margin-top:var(--space-1)"
                    placeholder="${t('changePasswordNewPlaceholder')}"
                    autocomplete="new-password">
         </div>
         <div class="auth-field" style="margin-bottom:0">
             <label style="font-size:var(--text-sm);color:var(--color-text-muted)">
                 ${t('changePasswordConfirm')}
             </label>
             <input id="cp-confirm" type="password" class="modal-confirm-input"
                    style="margin-top:var(--space-1)"
                    placeholder="${t('changePasswordConfirmPlaceholder')}"
                    autocomplete="new-password">
         </div>
         <p id="cp-error" style="margin-top:var(--space-3);font-size:var(--text-sm);
         color:#c0392b;min-height:1.2em"></p>`,
        [
            {
                label: t('changePasswordSubmit'),
                cls: 'btn-primary',
                id: 'cp-submit-btn',
                action: () => submitPasswordReset(resetToken)
            }
        ]
    );

    // Disable submit until user starts typing a new password
    const cpSubmitBtn = document.getElementById('cp-submit-btn');
    const cpNewInput = document.getElementById('cp-new');
    const cpConfirmInput = document.getElementById('cp-confirm');

    if (cpSubmitBtn) {
        cpSubmitBtn.disabled = true;
        cpSubmitBtn.classList.add('btn-disabled-empty');
    }

    const updateSubmitState = () => {
        const filled = cpNewInput.value.length > 0 && cpConfirmInput.value.length > 0;
        if (!cpSubmitBtn) return;
        cpSubmitBtn.disabled = !filled;
        cpSubmitBtn.classList.toggle('btn-disabled-empty', !filled);
    };

    cpNewInput?.addEventListener('input', updateSubmitState);
    cpConfirmInput?.addEventListener('input', updateSubmitState);

    return true;
}

/**
 * Submits the new password using the email-link reset token.
 * On success, logs the user in with the returned session JWT.
 */
async function submitPasswordReset(resetToken) {
    const newPw = document.getElementById('cp-new')?.value;
    const confirmPw = document.getElementById('cp-confirm')?.value;
    const errorEl = document.getElementById('cp-error');
    const btn = document.getElementById('cp-submit-btn');

    if (newPw !== confirmPw) {
        if (errorEl) errorEl.textContent = t('changePasswordErrorMismatch');
        return;
    }

    if (!PASSWORD_REGEX.test(newPw)) {
        if (errorEl) errorEl.textContent = t('authErrorPasswordPattern');
        return;
    }

    if (btn) btn.disabled = true;

    try {
        const res = await fetch('/api/user/reset-password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetToken, newPassword: newPw })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            if (errorEl) errorEl.textContent = data?.message || t('changePasswordErrorMismatch');
            return;
        }

        // Log the user in with the session token returned by the backend
        setToken(data.token);
        closeModal();
        hideAuthModal();
        hideGuestMode();
        await loadData();
        await loadCurrentUser();
        await syncPreferredLanguage();
        await syncPreferredTheme();
        switchView('settings');
        toast(t('changePasswordSuccess'));

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) btn.disabled = false;
    }
}
