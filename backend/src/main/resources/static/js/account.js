/**
 * account.js — Account settings actions for Epigraph.
 *
 * Change-password and delete-account flows (Settings → account). Extracted from quotes.js
 * (TASK-127); the username/avatar/profile-setup UI is planned to move here from auth.js in a
 * later step of the same refactor.
 *
 * Depends on:
 * - quotes           {Array}    — defined in state.js
 * - t()              {fn}       — defined in i18n.js
 * - showModal() / closeModal() / toast() {fn} — defined in ui.js
 * - authHeaders() / clearToken() {fn} — defined in auth.js
 *
 * Provides (globals): confirmDeleteAccount(), deleteAccount(),
 *   showChangePasswordModal(), submitChangePassword().
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
