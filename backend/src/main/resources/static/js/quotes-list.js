/**
 * quotes-list.js — The "Мои цитаты" list screen for Epigraph.
 *
 * Quote-card markup, search/filter, the sort dropdown, pagination ("show more"), expandable
 * cards, and the share-page highlight handoff. Extracted from quotes.js (TASK-127).
 *
 * Depends on:
 * - quotes / currentFilter / currentSort {globals} — defined in state.js
 * - LIST_PAGE_SIZE / listVisibleCount / listRenderedCount {globals} — defined in state.js
 * - Api              {Object}   — defined in api.js
 * - t()              {fn}       — defined in i18n.js
 * - escHtml() / moveNavIndicator() {fn} — defined in ui.js
 * - toggleFav() / copyQuote() / shareQuote() / editQuote() / deleteQuote() {fn} — defined in quotes.js
 *
 * Provides (globals): renderList(), setFilter(), searchByTag(), selectSort(), sortQuotes(),
 *   loadMoreQuotes(), hasPendingSharedImport(), highlightPendingSharedImport(), SORT_LABEL_KEYS.
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
