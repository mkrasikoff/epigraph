/**
 * account.js — Account & profile settings for Epigraph.
 *
 * The Settings account panel, avatar picker, username edit, first-run profile setup, the
 * app-version badge, and the change-password / delete-account flows. Assembled during the
 * TASK-127 refactor from the quotes.js tail (password/delete) and the auth.js profile UI.
 *
 * Depends on:
 * - quotes / currentUser / isGuest {globals} — defined in state.js / auth.js
 * - AVATAR_ICONS / avatarIconLabelKey() {globals} — defined in avatars.js
 * - Api              {Object}   — defined in api.js
 * - t()              {fn}       — defined in i18n.js
 * - showModal() / closeModal() / toast() {fn} — defined in ui.js
 * - authHeaders() / clearToken() {fn} — defined in session.js
 * - refreshAchievementsUi() / renderBadgePill() {fn} — defined in achievements.js
 *
 * Provides (globals): updateSettingsAccount(), showAvatarPickerModal(), submitAvatarIcon(),
 *   showEditUsernameModal(), submitEditUsername(), showProfileSetupModal(), submitProfileSetup(),
 *   loadAppVersion(), showChangePasswordModal(), submitChangePassword(),
 *   confirmDeleteAccount(), deleteAccount().
 */

// =============================================================================
// ACCOUNT — CHANGE PASSWORD / DELETE ACCOUNT
// Destructive and security-sensitive account actions, triggered from Settings.
// =============================================================================

/**
 * Shows a confirmation modal before deleting the account.
 * Two-step confirmation — user must click twice to proceed.
 */
function confirmDeleteAccount() {
    const phrase = t('deleteAccountConfirmPhrase');
    showModal(
        t('deleteAccountTitle'),
        `${t('deleteAccountBody')}
         <p style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted)">
             ${t('deleteConfirmHint')}<br><strong>${phrase}</strong>
         </p>
         <input id="delete-account-confirm-input" class="modal-confirm-input"
                placeholder="${t('deleteAccountConfirmPlaceholder')}"
                oninput="
                    var btn = document.getElementById('modal-delete-account-btn');
                    if (this.value === '${phrase}') {
                        btn.removeAttribute('disabled');
                        btn.style.opacity = '';
                        btn.style.pointerEvents = '';
                    } else {
                        btn.setAttribute('disabled', 'true');
                        btn.style.opacity = '0.45';
                        btn.style.pointerEvents = 'none';
                    }
                ">`,
        [
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal},
            {
                label: t('deleteAccountButton'),
                cls: 'btn-danger',
                id: 'modal-delete-account-btn',
                action: deleteAccount
            }
        ]
    );

    // Disable immediately after modal renders — no setTimeout needed
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const btn = document.getElementById('modal-delete-account-btn');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.style.opacity = '0.45';
            btn.style.pointerEvents = 'none';
        }
    }));
}

/**
 * Sends DELETE /api/user/me request, clears local state, and redirects to home.
 */
async function deleteAccount() {
    closeModal();
    try {
        const res = await fetch('/api/user/me', {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (!res.ok) throw new Error('Server error');

        clearToken();
        sessionStorage.clear();
        quotes = [];

        window.location.href = '/';
    } catch (e) {
        console.error('[deleteAccount] Failed:', e);
        toast(t('deleteAccountToastError'));
    }
}

/**
 * Opens the change-password modal.
 * Shows two fields: new password and confirm new password.
 */
function showChangePasswordModal() {
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
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal},
            {
                label: t('changePasswordSubmit'),
                cls: 'btn-primary',
                id: 'cp-submit-btn',
                action: submitChangePassword
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
}

/**
 * Submits the new-password request. No current password required —
 * account recovery is handled by the forgot-password flow.
 */
async function submitChangePassword() {
    const newPw = document.getElementById('cp-new')?.value;
    const confirmPw = document.getElementById('cp-confirm')?.value;
    const errorEl = document.getElementById('cp-error');
    const btn = document.getElementById('cp-submit-btn');

    if (newPw !== confirmPw) {
        if (errorEl) errorEl.textContent = t('changePasswordErrorMismatch');
        return;
    }

    if (btn) btn.disabled = true;

    try {
        const res = await fetch('/api/user/me/password', {
            method: 'PATCH',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: newPw })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
            if (errorEl) errorEl.textContent = data?.message || t('changePasswordErrorMismatch');
            return;
        }

        closeModal();
        toast(t('changePasswordSuccess'));

    } catch {
        if (errorEl) errorEl.textContent = t('authErrorConnection');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// =============================================================================
// PROFILE & SETTINGS
// Settings account panel, avatar picker, username edit, first-run profile setup,
// and the app-version badge. Moved here from auth.js (TASK-127).
// =============================================================================
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
