/**
 * quotes.js — Quote rendering, list, sort, favorites, add/edit/delete, and import/export for Epigraph.
 *
 * Depends on:
 * - quotes           {Array}    — global mutable quotes array, defined in index.html CONSTANTS
 * - currentFilter    {string}   — defined in index.html CONSTANTS
 * - currentSort      {string}   — defined in index.html CONSTANTS
 * - currentQodIndex  {number}   — defined in index.html CONSTANTS
 * - editingId        {number}   — defined in index.html CONSTANTS
 * - QOD_ANIMATION_DEBOUNCE_MS  {number} — defined in index.html CONSTANTS
 * - FAVORITE_RERENDER_DELAY_MS {number} — defined in index.html CONSTANTS
 * - LIST_PAGE_SIZE   {number}   — defined in state.js
 * - listVisibleCount {number}   — defined in state.js
 * - listRenderedCount {number}  — defined in state.js
 * - moveNavIndicator() {fn}     — defined in ui.js
 * - currentLanguage  {string}   — defined in i18n.js
 * - isGuest          {boolean}  — defined in auth.js
 * - currentTags      {Array}    — defined in tags.js
 * - Api              {Object}   — defined in api.js
 * - renderTags()     {fn}       — defined in tags.js
 * - renderEditTags() {fn}       — defined in tags.js
 * - escHtml()        {fn}       — defined in index.html UTILITIES
 * - formatQuoteAsText() {fn}    — defined in index.html UTILITIES
 * - showModal()      {fn}       — defined in index.html MODAL
 * - closeModal()     {fn}       — defined in index.html MODAL
 * - toast()          {fn}       — defined in index.html TOAST
 * - updateCharCounter()  {fn}   — defined in index.html UTILITIES
 * - updateInputCounter() {fn}   — defined in index.html UTILITIES
 * - t()              {fn}       — defined in i18n.js
 */

// =============================================================================
// ADD QUOTE
// Form handling for adding new quotes and form reset.
// =============================================================================

/**
 * Handles the new-quote form submission: validates input, posts it to the
 * backend, and updates the local quotes array on success.
 * @param {Event} e - The form submit event.
 * @returns {Promise<void>}
 */
/** Mirrors the backend's MAX_QUOTES_PER_USER cap — checked client-side to skip a wasted request. */
const MAX_QUOTES_PER_USER = 1000;

async function addQuote(e) {
    e.preventDefault();
    const text = document.getElementById('q-text').value.trim();

    if (!text) {
        toast(t('toastQuoteTextRequired'), 'error');
        document.getElementById('q-text').focus();
        return;
    }

    if (quotes.length >= MAX_QUOTES_PER_USER) {
        toast(t('toastQuoteLimitReached', {limit: MAX_QUOTES_PER_USER}), 'error');
        return;
    }

    const activeTagInput = document.querySelector('#tags-wrap .tag-input');

    if (activeTagInput) {
        const val = activeTagInput.value.trim();
        if (val && !currentTags.includes(val)) currentTags.push(val);
    }

    const payload = {
        text,
        author: document.getElementById('q-author').value.trim(),
        source: document.getElementById('q-source').value.trim(),
        tags: tagsToCsv(currentTags),
        fav: false,
        added: Date.now()
    };

    try {
        const res = await Api.create(payload);

        if (!res.ok) {
            const err = await res.json();
            const message = err.text || err.error || t('toastValidationError');
            toast(message, 'error');
            return;
        }

        const saved = await res.json();
        saved.tags = saved.tags ? saved.tags.split(',').filter(Boolean) : [];
        quotes.push(saved);
        toast(t('toastQuoteAdded'));
        resetForm();
        checkForNewAchievements();
    } catch (e) {
        toast(t('toastQuoteSaveError'));
    }
}

/**
 * Clears the add-quote form fields and resets the pending tags list.
 */
function resetForm() {
    document.getElementById('q-text').value = '';
    document.getElementById('q-author').value = '';
    document.getElementById('q-source').value = '';

    updateInputCounter(document.getElementById('q-author'), 'authorCounter', 100);
    updateInputCounter(document.getElementById('q-source'), 'sourceCounter', 200);

    currentTags = [];
    renderTags();

    const textarea = document.getElementById('q-text');

    if (textarea) updateCharCounter(textarea, 'quoteTextCounter', 'addQuoteSubmitBtn');
}

// =============================================================================
// FAVORITES
// Favourite toggling from the list view.
// =============================================================================

/**
 * Toggles the favourite flag of a quote and updates the UI in place.
 * @param {number|string} id - Quote identifier.
 * @returns {Promise<void>}
 */
async function toggleFav(id) {
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    q.fav = !q.fav;

    try {
        await Api.update(id, {...q, tags: tagsToCsv(q.tags)});

        const btn = document.querySelector(`.card-btn.fav[onclick="toggleFav(${id})"]`);
        if (btn) {
            btn.classList.toggle('active', q.fav);
            btn.querySelector('svg').setAttribute('fill', q.fav ? 'currentColor' : 'none');
        }

        const favCount = quotes.filter(q => q.fav).length;
        const statsBar = document.getElementById('stats-bar');

        if (statsBar) {
            statsBar.innerHTML = `<span>${t('statsTotal', {total: `<strong>${quotes.length}</strong>`})}</span><span>${t('statsFavorites', {count: `<strong>${favCount}</strong>`})}</span>`;
        }

        if (currentFilter === 'fav' && !q.fav) {
            const card = btn.closest('.quote-card');

            if (card) {
                card.style.transition = 'opacity 0.2s, transform 0.2s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.97)';
                setTimeout(() => renderList(), FAVORITE_RERENDER_DELAY_MS);
            }
        }

        // Only marking favorite (not un-marking) can move favorites_25 forward.
        if (q.fav) checkForNewAchievements();
    } catch (e) {
        q.fav = !q.fav;
        toast(t('toastError'));
    }
}

// =============================================================================
// COPY / EDIT / DELETE
// Single-quote copy-to-clipboard, edit and delete-with-confirmation actions.
// =============================================================================

/**
 * Copies a single quote to the clipboard.
 * @param {number|string} id - Quote identifier.
 */
function copyQuote(id) {
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    const text = formatQuoteAsText(q);
    navigator.clipboard.writeText(text)
        .then(() => toast(t('toastCopied')))
        .catch(() => toast(t('toastError')));
}

/**
 * Generates (or, on repeat calls for the same quote, re-fetches) a public share
 * link for the quote identified by id, then copies it straight to the
 * clipboard — same instant-copy pattern as copyQuote(), no intermediate modal
 * (there's nothing else to do with the link here: no revoke, no other actions).
 * @param {number|string} id - Quote identifier.
 */
function shareQuote(id) {
    Api.shareQuote(id)
        .then(({token}) => {
            if (!token) throw new Error('No token in response');
            const url = `${window.location.origin}/s/${token}`;

            return navigator.clipboard.writeText(url);
        })
        .then(() => toast(t('shareLinkCopied')))
        .catch(() => toast(t('shareLinkError'), 'error'));
}

/**
 * Opens a pre-filled edit modal for the quote identified by id.
 * @param {number|string} id - Quote identifier.
 */
function editQuote(id) {
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    editingId = id;
    editTags = [...(q.tags || [])];

    const body = `
    <div class="edit-form-group">
    <label for="editQuoteText">${t('addLabelText')} <span>${t('addRequired')}</span></label>
    <div class="edit-textarea-wrap">
        <textarea class="edit-textarea" id="editQuoteText" rows="4"
                  placeholder="${t('placeholderEditQuoteText')}"
                  maxlength="1000" autocomplete="off"></textarea>
        <div class="char-counter" id="editQuoteTextCounter">0 / 1000</div>
    </div>
    </div>
    <div class="edit-form-row">
      <div class="edit-form-group">
        <label for="edit-author">${t('addLabelAuthor')} <span>${t('addOptional')}</span></label>
        <div class="edit-input-wrap">
            <input class="edit-input" type="text" id="edit-author" value="${escHtml(q.author || '')}" placeholder="${t('placeholderEditAuthor')}" maxlength="100" autocomplete="off">
            <div class="char-counter" id="editAuthorCounter">${(q.author || '').length} / 100</div>
        </div>
      </div>
      <div class="edit-form-group">
        <label for="edit-source">${t('addLabelSource')} <span>${t('addOptional')}</span></label>
        <div class="edit-input-wrap">
            <input class="edit-input" type="text" id="edit-source" value="${escHtml(q.source || '')}" placeholder="${t('placeholderEditSource')}" maxlength="200" autocomplete="off">
            <div class="char-counter" id="editSourceCounter">${(q.source || '').length} / 200</div>
        </div>
      </div>
    </div>
    <div class="edit-form-group">
      <label>${t('addLabelTags')} <span>${t('addOptional')}</span></label>
      <div class="tag-input-wrap" id="edit-tags-wrap"></div>
    </div>
  `;

    showModal(
        t('editModalTitle'),
        body,
        [
            {label: t('editSaveButton'), cls: 'btn-primary', id: 'editQuoteSubmitBtn', action: saveEditQuote},
            {
                label: t('editCancelButton'), cls: 'btn-secondary', action: () => {
                    closeModal();
                    editingId = null;
                }
            }
        ],
        true
    );

    const editQuoteTextArea = document.getElementById('editQuoteText');
    if (editQuoteTextArea) {
        editQuoteTextArea.value = q.text || '';
        updateCharCounter(editQuoteTextArea, 'editQuoteTextCounter', 'editQuoteSubmitBtn');
        editQuoteTextArea.addEventListener('input', () => {
            updateCharCounter(editQuoteTextArea, 'editQuoteTextCounter', 'editQuoteSubmitBtn');
        });
    }

    const editAuthorInput = document.getElementById('edit-author');
    if (editAuthorInput) {
        updateInputCounter(editAuthorInput, 'editAuthorCounter', 100);
        editAuthorInput.addEventListener('input', () => updateInputCounter(editAuthorInput, 'editAuthorCounter', 100));
    }

    const editSourceInput = document.getElementById('edit-source');
    if (editSourceInput) {
        updateInputCounter(editSourceInput, 'editSourceCounter', 200);
        editSourceInput.addEventListener('input', () => updateInputCounter(editSourceInput, 'editSourceCounter', 200));
    }

    renderEditTags();
}

/**
 * Reads the edit form values and persists the updated quote via PUT.
 * @returns {Promise<void>}
 */
async function saveEditQuote() {
    const id = editingId;
    if (id === null) return;

    const text = document.getElementById('editQuoteText')?.value.trim();
    if (!text) {
        toast(t('toastQuoteTextRequired'), 'error');
        return;
    }

    const q = quotes.find(q => q.id === id);
    if (!q) return;

    const activeInput = document.querySelector('#edit-tags-wrap .tag-input');
    if (activeInput) {
        const val = activeInput.value.trim();
        if (val && !editTags.includes(val)) editTags.push(val);
    }

    const tags = [...editTags];

    const payload = {
        ...q,
        text,
        author: document.getElementById('edit-author')?.value.trim() || '',
        source: document.getElementById('edit-source')?.value.trim() || '',
        tags: tagsToCsv(tags)
    };

    try {
        const res = await Api.update(id, payload);

        if (!res.ok) {
            toast(t('toastQuoteUpdateError'), 'error');
            return;
        }

        Object.assign(q, {...payload, tags});
        closeModal();
        editingId = null;
        renderList();
        toast(t('toastQuoteUpdated'));
        checkForNewAchievements();
    } catch (e) {
        toast(t('toastConnectionError'), 'error');
    }
}

/**
 * Prompts the user for confirmation and deletes a single quote.
 * @param {number|string} id - Quote identifier.
 * @returns {Promise<void>}
 */
async function deleteQuote(id) {
    const q = quotes.find(q => q.id === id);
    if (!q) return;

    showModal(
        t('deleteModalTitle'),
        `<div class="modal-quote-text">${escHtml(q.text)}</div><div class="modal-quote-author">${escHtml(q.author || '')}</div>${t('deleteModalCannotUndo')}`,
        [{
            label: t('deleteButton'), cls: 'btn-danger', action: async () => {
                try {
                    await Api.delete(id);
                    quotes = quotes.filter(q => q.id !== id);
                    renderList();
                    closeModal();
                    toast(t('toastQuoteDeleted'));
                } catch (e) {
                    toast(t('toastDeleteError'));
                }
            }
        },
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal}],
        true
    );
}

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
