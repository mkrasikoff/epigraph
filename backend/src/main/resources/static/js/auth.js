/**
 * auth.js — Authentication state and UI for Epigraph.
 *
 * Depends on:
 * - getGuestQuotes() {fn}       — preset quotes for guest mode, defined in guest-quotes.js
 * - quotes           {Array}    — global mutable quotes array, defined in index.html CONSTANTS
 * - currentQodIndex  {number}   — defined in index.html CONSTANTS
 * - loadData()       {fn}       — defined in api.js
 * - renderQod()      {fn}       — defined in qod.js
 * - renderQodAnimated() {fn}    — defined in qod.js
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
// AUTH UI
// The block responsible for authentication screens, modes, and session flow.
// =============================================================================
let authMode = 'login';
let isGuest = true;

function showAuthModal() {
    document.getElementById('auth-screen').classList.add('visible');
    document.getElementById('app-blur-overlay').classList.add('visible');
    document.body.classList.add('modal-lock-scroll');
    // Re-apply OAuth button visibility on every open. A user who was logged in at
    // page load (so bootstrap skipped initAuthButtons) would otherwise see the
    // buttons stuck hidden after logout until a refresh. Cached region → no refetch.
    initAuthButtons();
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

    document.getElementById('account-menu').style.display = 'none';
    closeAccountMenu();
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

    document.getElementById('account-menu').style.display = '';
    document.getElementById('login-btn').style.display = 'none';
    document.querySelector('[data-lang-toggle]')?.style.setProperty('display', 'none');
    updateHeaderAccount();

    ['list', 'add', 'settings'].forEach(id => {
        document.getElementById('tab-' + id)?.classList.remove('guest-locked');
        document.getElementById('btn-fav-qod')?.classList.remove('guest-locked');
    });
}

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
                errorEl.textContent = codeToText(data.password, 'authErrorPasswordPattern');
                return;
            }

            if (data.email) {
                errorEl.textContent = t('authErrorInvalidEmailServer');
                return;
            }

            errorEl.textContent = apiErrorMessage(data, 'authErrorWrongCredentials');

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
        await applyPendingRedeem();   // activate a /?redeem code stashed while signed out (TASK-131)
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
            if (errorEl) errorEl.textContent = apiErrorMessage(data, 'authErrorWrongCredentials');
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

// Region gate for the OAuth buttons, resolved once per session from /api/geo and
// reused on every subsequent auth-modal open. null = not resolved yet.
let authButtonsIsRussia = null;

async function initAuthButtons() {
    // Already resolved this session (e.g. reopening login after a logout) — re-apply
    // instantly from cache, no refetch and no locale-guess flash. This is what makes
    // the buttons appear on a logout→login cycle without a page refresh: initAuthButtons()
    // otherwise only runs once at bootstrap, and only when the visitor arrives token-less.
    if (authButtonsIsRussia !== null) {
        applyAuthButtonVisibility(authButtonsIsRussia);
        return;
    }

    // Both buttons start hidden in the HTML — apply an instant, zero-latency best guess
    // from the browser locale first so they don't flash empty while /api/geo (an external
    // IP lookup) resolves, then correct it below once the accurate answer is in. The actual
    // region gate for the OAuth flow itself is enforced server-side (GeoBlockFilter)
    // regardless of which button was visible, so a brief mismatch here is only cosmetic.
    applyAuthButtonVisibility(/^ru\b/i.test(navigator.language || ''));

    try {
        const res = await fetch('/api/geo');
        const data = await res.json();
        authButtonsIsRussia = data.country === 'RU';
        applyAuthButtonVisibility(authButtonsIsRussia);
    } catch (e) {
        // On error — show all OAuth buttons, and leave the region unresolved so the
        // next modal open retries the lookup instead of caching the failure.
        document.querySelectorAll('.btn-google, .btn-yandex').forEach(btn => {
            btn.style.display = '';
        });
    }
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
            if (errorEl) errorEl.textContent = apiErrorMessage(data, 'verifyErrorInvalidCode');
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
            if (errorEl) errorEl.textContent = apiErrorMessage(data, 'changePasswordErrorMismatch');
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
