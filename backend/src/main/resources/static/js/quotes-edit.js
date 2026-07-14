/**
 * quotes-edit.js — Quote mutations for Epigraph.
 *
 * Add-quote form handling, favourite toggling from the list, single-quote copy/share, and the
 * edit + delete modals. The former quotes.js was split into qod.js / quotes-list.js /
 * import-export.js / account.js and this file (TASK-127).
 *
 * Depends on:
 * - quotes / currentFilter / currentTags / editTags / editingId {globals} — defined in state.js / tags.js
 * - FAVORITE_RERENDER_DELAY_MS {number} — defined in state.js
 * - Api              {Object}   — defined in api.js
 * - t()              {fn}       — defined in i18n.js
 * - escHtml() / formatQuoteAsText() / showModal() / closeModal() / toast() {fn} — defined in ui.js
 * - updateCharCounter() / updateInputCounter() {fn} — defined in ui.js
 * - renderTags() / renderEditTags() {fn} — defined in tags.js
 * - renderList() {fn} — defined in quotes-list.js
 * - checkForNewAchievements() {fn} — defined in auth.js
 *
 * Provides (globals): addQuote(), resetForm(), toggleFav(), copyQuote(), shareQuote(),
 *   editQuote(), saveEditQuote(), deleteQuote(), MAX_QUOTES_PER_USER.
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
