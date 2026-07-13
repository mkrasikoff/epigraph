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
// QUOTES LIST
// Filtering, search, and rendering for the list-of-all-quotes view.
// =============================================================================
/**
 * Renders a single quote card's markup.
 * @param {Object} q - Quote object.
 * @param {number} index - Position within the currently rendered list (drives the entrance animation delay).
 * @param {Map<number, number>} rankMap - Quote id -> display rank (order added), shared across all cards.
 * @returns {string}
 */
function renderQuoteCard(q, index, rankMap) {
    return `
        <article class="quote-card" data-id="${q.id}" style="animation-delay: ${Math.min(index * 40, 300)}ms">
          <span class="quote-card-num">${rankMap.get(q.id) ?? '—'}</span>
          <div class="quote-card-text-wrap">
            <p class="quote-card-text">${escHtml(q.text)}</p>
          </div>
          <span class="quote-card-expand-hint">${t('expandHintOpen')}</span>
          ${q.tags && q.tags.length ? `<div class="quote-card-tags">${q.tags.map(tag => `<button class="quote-tag-chip" onclick="searchByTag('${escHtml(tag)}')">${escHtml(tag)}</button>`).join('')}</div>` : ''}
          <div class="quote-card-meta">
            <div>
              ${q.author ? `<div class="quote-card-author">${escHtml(q.author)}</div>` : ''}
              ${q.source ? `<div class="quote-card-source">${escHtml(q.source)}</div>` : ''}
            </div>
            <div class="quote-card-actions">
              <button class="card-btn fav ${q.fav ? 'active' : ''}" onclick="toggleFav(${q.id})" aria-label="${t('ariaFavorite')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${q.fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
              <button class="card-btn" onclick="copyQuote(${q.id})" aria-label="${t('ariaCopy')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button class="card-btn" onclick="shareQuote(${q.id})" aria-label="${t('ariaShare')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button class="card-btn edit" onclick="editQuote(${q.id})" aria-label="${t('ariaEdit')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="card-btn danger" onclick="deleteQuote(${q.id})" aria-label="${t('ariaDelete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
}

/**
 * Renders the list view, applying the current search query and filter.
 * Only the first `listVisibleCount` matching quotes are put in the DOM — the rest load
 * incrementally via loadMoreQuotes() — so opening the tab on a large collection doesn't
 * force a synchronous layout over every single card.
 * @param {boolean} [resetPage=true] - Whether to jump back to the first page (any search/filter/
 *   sort/data change) or keep the current page and only append newly-revealed cards (loadMoreQuotes()).
 */
function renderList(resetPage = true) {
    const query = (document.getElementById('search-input').value || '').toLowerCase().trim();

    let filteredQuotes = quotes.filter(q => {
        if (currentFilter === 'fav' && !q.fav) return false;
        if (!query) return true;

        return (q.text + ' ' + (q.author || '') + ' ' + (q.source || '') + ' ' + (q.tags || []).join(' ')).toLowerCase().includes(query);
    });

    filteredQuotes = sortQuotes(filteredQuotes);

    const grid = document.getElementById('quotes-grid');
    const total = quotes.length;
    const favCount = quotes.filter(q => q.fav).length;

    document.getElementById('stats-bar').innerHTML =
        `<span>${t('statsTotal', {total: `<strong>${total}</strong>`})}</span><span>${t('statsFavorites', {count: `<strong>${favCount}</strong>`})}</span>`;

    if (resetPage) listVisibleCount = LIST_PAGE_SIZE;

    if (!filteredQuotes.length) {
        grid.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
                </svg>
              </div>
              <h3>${query ? t('emptyStateNoResults') : t('emptyStateNoQuotes')}</h3>
              <p>${query ? t('emptyStateNoResultsHint') : t('emptyStateNoQuotesHint')}</p>
            </div>
          `;
        listRenderedCount = 0;
        renderShowMoreButton(0, 0);
        return;
    }

    const sortedByAdd = [...quotes].sort((a, b) => (a.id || 0) - (b.id || 0));
    const rankMap = new Map(sortedByAdd.map((q, i) => [q.id, i + 1]));

    const visibleQuotes = filteredQuotes.slice(0, listVisibleCount);
    const startIndex = resetPage ? 0 : listRenderedCount;
    const newCardsHtml = visibleQuotes.slice(startIndex).map((q, i) => renderQuoteCard(q, startIndex + i, rankMap)).join('');

    if (resetPage) {
        grid.innerHTML = newCardsHtml;
    } else {
        grid.insertAdjacentHTML('beforeend', newCardsHtml);
    }

    listRenderedCount = visibleQuotes.length;

    markClippedCards();
    initExpandableCards();
    renderShowMoreButton(visibleQuotes.length, filteredQuotes.length);
}

/**
 * localStorage key share.js writes before redirecting from the public share
 * page's "View in my collection" button to /#all — see goToImportedQuote()
 * in share.js.
 */
const SHARE_HIGHLIGHT_STORAGE_KEY = 'epigraph_highlight_quote_id';

/**
 * @returns {boolean} Whether a share-page redirect is waiting to be highlighted,
 *   without consuming it — used by switchView() to render the full unpaginated
 *   list so the target card isn't hidden behind "show more".
 */
function hasPendingSharedImport() {
    try {
        return !!localStorage.getItem(SHARE_HIGHLIGHT_STORAGE_KEY);
    } catch (e) {
        return false;
    }
}

const SHARE_HIGHLIGHT_FADE_MS = 900;
const SHARE_HIGHLIGHT_HOLD_MS = 1100;

/**
 * Scrolls to and briefly highlights the quote card left behind by a "View in
 * my collection" redirect from the public share page, then clears the flag.
 * No-ops silently if the flag is absent or the card isn't in the current
 * (already fully rendered, thanks to hasPendingSharedImport()) list.
 *
 * Fades out via an intermediate .just-shared-fade-out modifier rather than
 * just removing .just-shared directly — a CSS transition's duration comes
 * from the state being transitioned TO, so removing .just-shared outright
 * would fade out using .quote-card's own snappy 180ms hover transition
 * instead of this highlight's slower, deliberate one. Keeping .just-shared
 * applied while flipping the box-shadow value keeps that slower transition
 * in effect for the fade-out too — see the CSS comment in styles.css.
 */
function highlightPendingSharedImport() {
    let pendingId;
    try {
        pendingId = localStorage.getItem(SHARE_HIGHLIGHT_STORAGE_KEY);
        if (pendingId) localStorage.removeItem(SHARE_HIGHLIGHT_STORAGE_KEY);
    } catch (e) {
        return;
    }
    if (!pendingId) return;

    const card = document.querySelector(`.quote-card[data-id="${pendingId}"]`);
    if (!card) return;

    card.scrollIntoView({behavior: 'smooth', block: 'center'});
    card.classList.add('just-shared');

    setTimeout(() => {
        card.classList.add('just-shared-fade-out');
        setTimeout(() => card.classList.remove('just-shared', 'just-shared-fade-out'), SHARE_HIGHLIGHT_FADE_MS);
    }, SHARE_HIGHLIGHT_HOLD_MS);
}

/**
 * Loads the next page of quotes into the currently filtered/sorted list view.
 */
function loadMoreQuotes() {
    listVisibleCount += LIST_PAGE_SIZE;
    renderList(false);
}

/**
 * Renders (or hides) the "show more" control below the grid.
 * @param {number} shownCount - Quotes currently rendered.
 * @param {number} totalCount - Quotes matching the current search/filter.
 */
function renderShowMoreButton(shownCount, totalCount) {
    const container = document.getElementById('list-load-more');
    if (!container) return;

    const remaining = totalCount - shownCount;
    if (remaining <= 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `<button class="btn-secondary" onclick="loadMoreQuotes()">${t('listShowMore', {remaining})}</button>`;
}

/**
 * Adds the is-clipped class to cards whose text overflows its container.
 * Reads scrollHeight/clientHeight for every card first (forcing at most one synchronous
 * layout total), then applies the resulting classes in a separate pass — interleaving
 * reads and writes here would force a fresh layout recalculation on every single card.
 */
function markClippedCards() {
    const wraps = [...document.querySelectorAll('.quote-card-text')]
        .map(el => el.closest('.quote-card-text-wrap'))
        .filter(Boolean);

    const clipped = wraps.map(wrap => {
        const el = wrap.querySelector('.quote-card-text');
        return el.scrollHeight > el.clientHeight + 2;
    });

    wraps.forEach((wrap, i) => wrap.classList.toggle('is-clipped', clipped[i]));
}

/**
 * Attaches a single delegated click listener on the quotes grid for expand/collapse.
 * Runs only once per grid mount.
 */
function initExpandableCards() {
    const grid = document.getElementById('quotes-grid');
    if (!grid || grid._expandListenerAttached) return;
    grid._expandListenerAttached = true;

    grid.addEventListener('click', function (e) {
        if (e.target.closest('.card-btn, .quote-tag-chip')) return;

        const card = e.target.closest('.quote-card');
        if (!card) return;

        const wrap = card.querySelector('.quote-card-text-wrap');
        const hint = card.querySelector('.quote-card-expand-hint');
        const isClipped = wrap?.classList.contains('is-clipped');
        const isExpanded = card.classList.contains('is-expanded');

        if (!isClipped && !isExpanded) return;

        if (isExpanded) {
            card.classList.remove('is-expanded');
            if (hint) hint.textContent = t('expandHintOpen');
        } else {
            document.querySelectorAll('.quote-card.is-expanded').forEach(c => {
                c.classList.remove('is-expanded');
                const h = c.querySelector('.quote-card-expand-hint');
                if (h) h.textContent = t('expandHintOpen');
            });

            card.classList.add('is-expanded');

            if (hint) hint.textContent = t('expandHintClose');

            card.scrollIntoView({behavior: 'smooth', block: 'nearest'});
        }
    });
}

/**
 * Updates the active list filter and re-renders the list.
 * @param {string} filter - Filter identifier ('all' or 'fav').
 * @param {HTMLElement} btn - The filter button that was clicked.
 */
function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
}

// =============================================================================
// SORT DROPDOWN
// Custom pill-style sort control: open/close, selection, and persistence.
// =============================================================================
// Maps sort keys to i18n keys (not translated strings) so the label can be
// recomputed on demand — e.g. by applyI18n()'s sort-label resync — instead of
// going stale after a language switch.
const SORT_LABEL_KEYS = {
    date_desc: 'sortDateDesc',
    date_asc: 'sortDateAsc',
    author_asc: 'sortAuthorAsc',
    author_desc: 'sortAuthorDesc',
};

/**
 * Toggles the sort dropdown menu open/closed.
 */
function toggleSortMenu() {
    const btn = document.getElementById('sort-btn');
    const menu = document.getElementById('sort-menu');
    const isOpen = menu.classList.contains('open');

    if (isOpen) {
        closeSortMenu();
    } else {
        btn.classList.add('open');
        menu.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
    }
}

/**
 * Closes the sort dropdown menu.
 */
function closeSortMenu() {
    const btn = document.getElementById('sort-btn');
    const menu = document.getElementById('sort-menu');
    btn?.classList.remove('open');
    menu?.classList.remove('open');
    btn?.setAttribute('aria-expanded', 'false');
}

/**
 * Selects a sort option, updates the button label, persists to localStorage,
 * closes the menu, and re-renders the list.
 * @param {string} value - Sort key.
 */
function selectSort(value) {
    currentSort = value;

    try {
        localStorage.setItem('epigraph_sort', value);
    } catch (e) {
    }

    const label = document.getElementById('sort-btn-label');
    if (label) label.textContent = t(SORT_LABEL_KEYS[value] || SORT_LABEL_KEYS.date_desc);

    document.querySelectorAll('.sort-menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.sort === value);
    });

    closeSortMenu();
    renderList();
}

/**
 * Sorts a quotes array according to currentSort.
 * @param {Array} arr - Array of quote objects.
 * @returns {Array} New sorted array (original not mutated).
 */
function sortQuotes(arr) {
    const sorted = [...arr];
    switch (currentSort) {
        case 'date_asc':
            return sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
        case 'author_asc':
            return sorted.sort((a, b) => (a.author || '').localeCompare(b.author || '', 'ru'));
        case 'author_desc':
            return sorted.sort((a, b) => (b.author || '').localeCompare(a.author || '', 'ru'));
        case 'date_desc':
        default:
            return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
}

// Close sort menu on outside click
document.addEventListener('click', e => {
    if (!document.getElementById('sort-dropdown')?.contains(e.target)) {
        closeSortMenu();
    }
});

/**
 * Populates the search input with the given tag and re-renders the list.
 * @param {string} tag - Tag value to search for.
 */
function searchByTag(tag) {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.value = tag;
    renderList();
}

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
