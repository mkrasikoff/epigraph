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
 * - GUEST_QUOTES     {Array}    — defined in index.html CONSTANTS
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
// QUOTE OF THE DAY
// Rendering, randomisation, copying, and favouriting for the QoD section.
// =============================================================================
/**
 * Returns the index of a quote in the local array by its ID.
 * Used to locate the backend-selected QoD quote in the local quotes array.
 * @param {number} id - Quote ID returned by the backend /api/quotes/qod endpoint.
 * @returns {number} Index within quotes[], or 0 as fallback.
 */
function getQodIndexById(id) {
    const idx = quotes.findIndex(q => q.id === id);
    return idx !== -1 ? idx : 0;
}

/**
 * Renders the Quote of the Day section.
 * Accepts either a backend-resolved quote object (preferred) or a fallback index.
 * @param {Object|number} [qodOrIdx] - A full quote object from the backend, or a numeric index override.
 */
function renderQod(qodOrIdx) {
    if (!quotes.length) {
        const emptyText = t('qodEmptyText');
        document.getElementById('qod-text').textContent = emptyText;
        document.getElementById('qod-author').textContent = '';
        document.getElementById('qod-source').textContent = '';
        document.getElementById('qod-progress').textContent = '';
        applyQodAdaptiveSize(emptyText);
        setQodActionsDisabled(true);
        return;
    }

    setQodActionsDisabled(false);

    let idx;
    if (qodOrIdx !== undefined && typeof qodOrIdx === 'object' && qodOrIdx !== null) {
        // Backend-driven: locate the quote in the local array by ID
        idx = getQodIndexById(qodOrIdx.id);
    } else if (typeof qodOrIdx === 'number') {
        // Numeric override (used by randomQuote() and swipe gestures)
        idx = qodOrIdx;
    } else {
        // Fallback: pick index 0 (backend call should always provide a quote)
        idx = 0;
    }

    currentQodIndex = idx;
    const q = quotes[idx];
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', {weekday: 'long', day: 'numeric', month: 'long'});
    document.getElementById('qod-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const textEl = document.getElementById('qod-text');

    // Update content synchronously so callers can measure the new card height immediately
    textEl.textContent = q.text;
    applyQodAdaptiveSize(q.text);
    document.getElementById('qod-author').textContent = q.author || '';
    document.getElementById('qod-source').textContent = q.source || '';
    updateFavQodButton();

    document.fonts.ready.then(() => {
        const section = document.querySelector('.qod-section');
        const fits = section.getBoundingClientRect().height <= (window.innerHeight - 57) + 2;
        document.body.classList.toggle('no-scroll', fits);
    });

    document.getElementById('qod-progress').textContent = isGuest ? '' : t('qodProgress', {current: idx + 1, total: quotes.length});
}

/**
 * Adjusts QoD text font size and card width based on quote length to optimise readability.
 * @param {string} text - The quote text to measure.
 */
function applyQodAdaptiveSize(text) {
    const card = document.querySelector('.qod-card');
    const el = document.getElementById('qod-text');

    const len = text.length;

    function estimateLines(fontSizeRem, cardWidthPx) {
        const charsPerLine = (cardWidthPx * 0.88) / (fontSizeRem * 16 * 0.55);
        return Math.ceil(len / charsPerLine);
    }

    const widths = [
        {cls: 'qod-size-short', px: 480},
        {cls: 'qod-size-medium', px: 740},
        {cls: 'qod-size-long', px: 960},
        {cls: 'qod-size-very-long', px: 1100},
    ];

    const fontSizes = [3.4, 2.8, 2.2, 1.8, 1.5];

    let chosenWidth = widths[widths.length - 1];
    let chosenFont = fontSizes[fontSizes.length - 1];

    outer:
        for (const fontSize of fontSizes) {
            for (const width of widths) {
                if (estimateLines(fontSize, width.px) <= 2) {
                    chosenFont = fontSize;
                    chosenWidth = width;
                    break outer;
                }
            }
        }

    card.classList.remove('qod-size-short', 'qod-size-medium', 'qod-size-long', 'qod-size-very-long');
    card.classList.add(chosenWidth.cls);

    const minFontSize = (chosenFont * 0.72).toFixed(2);
    const midFontSize = (chosenFont * 0.55).toFixed(2);

    el.style.fontSize = `clamp(${minFontSize}rem, ${midFontSize}rem + 2vw, ${chosenFont}rem)`;
}

/**
 * Enables or disables the QoD action buttons based on whether quotes are available.
 * @param {boolean} disabled
 */
function setQodActionsDisabled(disabled) {
    const actions = [
        {selector: '.qod-actions .btn-primary', msg: 'Сначала добавьте хотя бы одну цитату'},
        {selector: '.qod-actions .btn-secondary:not(#btn-fav-qod)', msg: 'Сначала добавьте хотя бы одну цитату'},
        {selector: '#btn-fav-qod', msg: 'Сначала добавьте хотя бы одну цитату'},
    ];

    actions.forEach(({selector, msg}) => {
        const btn = document.querySelector(selector);

        if (!btn) return;

        if (disabled) {
            btn.dataset.disabledMsg = msg;
            btn.dataset.originalOnclick = btn.getAttribute('onclick') || '';
            btn.setAttribute('onclick', `toast('${msg}', 'error'); return false;`);
            btn.classList.add('btn-disabled-empty');
        } else {
            if (btn.dataset.originalOnclick !== undefined) {
                btn.setAttribute('onclick', btn.dataset.originalOnclick);
            }

            btn.classList.remove('btn-disabled-empty');
        }
    });
}

/**
 * Picks a random quote different from the current one and renders it in the QoD section.
 */
function randomQuote() {
    if (!quotes.length) return;

    let idx;
    do {
        idx = Math.floor(Math.random() * quotes.length);
    } while (idx === currentQodIndex && quotes.length > 1);

    const card = document.querySelector('.qod-card');
    if (!card) { renderQod(idx); return; }

    // Phase 1: collapse card upward
    const prevHeight = card.offsetHeight;
    card.style.height = prevHeight + 'px';
    card.style.transition = 'opacity 180ms ease-in, transform 180ms ease-in';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-12px) scale(0.98)';

    setTimeout(() => {
        // Phase 2: card is invisible — now safely update content and measure
        card.style.transition = 'none';
        card.style.transform = 'translateY(14px) scale(0.97)';
        card.style.opacity = '0';
        card.style.height = 'auto'; // release freeze temporarily

        // Update content synchronously (renderQod no longer has its own animation)
        renderQod(idx);

        // Force reflow so browser computes new dimensions with new text + font size + width class
        void card.offsetHeight;

        const newHeight = card.offsetHeight;
        const heightChanged = Math.abs(newHeight - prevHeight) > 4;

        // Lock to prevHeight so we can animate the transition
        if (heightChanged) card.style.height = prevHeight + 'px';

        // Phase 3: single coordinated entry — card slides up, fades in, height expands simultaneously
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const transitions = [
                    'opacity 380ms ease-out',
                    'transform 440ms cubic-bezier(0.16, 1, 0.3, 1)',
                ];
                if (heightChanged) transitions.push('height 440ms cubic-bezier(0.16, 1, 0.3, 1)');

                card.style.transition = transitions.join(', ');
                card.style.opacity = '1';
                card.style.transform = '';
                if (heightChanged) card.style.height = newHeight + 'px';

                setTimeout(() => {
                    card.style.transition = 'none';
                    card.style.opacity = '';
                    card.style.transform = '';
                    card.style.height = '';
                    requestAnimationFrame(() => {
                        card.style.transition = '';
                    });
                }, 460);
            });
        });
    }, 190);
}

/**
 * Copies the currently displayed QoD quote to the clipboard.
 */
function copyQod() {
    const q = quotes[currentQodIndex];
    if (!q) return;
    const text = formatQuoteAsText(q);

    navigator.clipboard.writeText(text)
        .then(() => toast(t('toastCopied')))
        .catch(() => toast(t('toastCopyError')));
}

/**
 * Toggles the favourite flag on the currently displayed QoD quote and persists the change.
 * @returns {Promise<void>}
 */
async function favQod() {
    if (isGuest) {
        toast(t('toastLoginRequired'));
        return;
    }

    const q = quotes[currentQodIndex];
    if (!q) return;
    q.fav = !q.fav;

    try {
        await Api.update(q.id, {...q, tags: tagsToCsv(q.tags)});
        updateFavQodButton();
    } catch (e) {
        q.fav = !q.fav;
        toast(t('toastError'));
    }
}

/**
 * Updates the QoD "favourite" button to reflect the current quote's fav state.
 */
function updateFavQodButton() {
    const q = quotes[currentQodIndex];
    const btn = document.getElementById('btn-fav-qod');

    if (!btn || !q) return;

    const isFav = !!q.fav;
    btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color:${isFav ? 'var(--color-gold)' : 'inherit'}">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    ${isFav ? t('favActive') : t('favInactive')}
  `;
    btn.style.color = isFav ? 'var(--color-gold)' : '';
}

// =============================================================================
// QUOTES LIST
// Filtering, search, and rendering for the list-of-all-quotes view.
// =============================================================================
/**
 * Renders the list view, applying the current search query and filter.
 */
function renderList() {
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

    if (!filteredQuotes.length) {
        grid.innerHTML = `<div class="empty-state"><h3>${query ? t('emptyStateNoResults') : t('emptyStateNoQuotes')}</h3><p>${query ? t('emptyStateNoResultsHint') : t('emptyStateNoQuotesHint')}</p></div>`;
        return;
    }

    const sortedByAdd = [...quotes].sort((a, b) => (a.id || 0) - (b.id || 0));
    const rankMap = new Map(sortedByAdd.map((q, i) => [q.id, i + 1]));

    grid.innerHTML = filteredQuotes.map((q, index) => `
        <article class="quote-card" style="animation-delay: ${Math.min(index * 40, 300)}ms">
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
              <button class="card-btn edit" onclick="editQuote(${q.id})" aria-label="${t('ariaEdit')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="card-btn danger" onclick="deleteQuote(${q.id})" aria-label="${t('ariaDelete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>
        </article>
      `).join('');

    markClippedCards();
    initExpandableCards();
}

/**
 * Adds the is-clipped class to cards whose text overflows its container.
 */
function markClippedCards() {
    document.querySelectorAll('.quote-card-text').forEach(el => {
        const wrap = el.closest('.quote-card-text-wrap');
        if (!wrap) return;

        wrap.classList.toggle('is-clipped', el.scrollHeight > el.clientHeight + 2);
    });
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
const SORT_LABELS = {
    date_desc: t('sortDateDesc'),
    date_asc: t('sortDateAsc'),
    author_asc: t('sortAuthorAsc'),
    author_desc: t('sortAuthorDesc'),
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
    if (label) label.textContent = SORT_LABELS[value] || value;

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

// Close sort and notification interval menus on outside click
document.addEventListener('click', e => {
    if (!document.getElementById('sort-dropdown')?.contains(e.target)) {
        closeSortMenu();
    }

    if (!document.getElementById('notif-interval-dropdown')?.contains(e.target)) {
        closeNotifIntervalMenu();
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
async function addQuote(e) {
    e.preventDefault();
    const text = document.getElementById('q-text').value.trim();

    if (!text) {
        toast(t('toastQuoteTextRequired'), 'error');
        document.getElementById('q-text').focus();
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
            const message = err.text || err.error || 'Ошибка валидации';
            toast(message, 'error');
            return;
        }

        const saved = await res.json();
        saved.tags = saved.tags ? saved.tags.split(',').filter(Boolean) : [];
        quotes.push(saved);
        toast(t('toastQuoteAdded'));
        resetForm();
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
    <label for="editQuoteText">Текст цитаты <span>(обязательно)</span></label>
    <div class="edit-textarea-wrap">
        <textarea class="edit-textarea" id="editQuoteText" rows="4"
                  placeholder="${t('placeholderEditQuoteText')}"
                  maxlength="1000"></textarea>
        <div class="char-counter" id="editQuoteTextCounter">0 / 1000</div>
    </div>
    </div>
    <div class="edit-form-row">
      <div class="edit-form-group">
        <label for="edit-author">Автор <span>(необязательно)</span></label>
        <div class="edit-input-wrap">
            <input class="edit-input" type="text" id="edit-author" value="${escHtml(q.author || '')}" placeholder="${t('placeholderEditAuthor')}" maxlength="100">
            <div class="char-counter" id="editAuthorCounter">${(q.author || '').length} / 100</div>
        </div>
      </div>
      <div class="edit-form-group">
        <label for="edit-source">Источник <span>(необязательно)</span></label>
        <div class="edit-input-wrap">
            <input class="edit-input" type="text" id="edit-source" value="${escHtml(q.source || '')}" placeholder="${t('placeholderEditSource')}" maxlength="200">
            <div class="char-counter" id="editSourceCounter">${(q.source || '').length} / 200</div>
        </div>
      </div>
    </div>
    <div class="edit-form-group">
      <label>Теги <span>(необязательно)</span></label>
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
        ]
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
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal}]
    );
}

// =============================================================================
// IMPORT / EXPORT
// Bulk JSON import, JSON export, copy-all-as-text, and delete-all operations.
// =============================================================================

/**
 * Reads a user-selected JSON file and shows a preview modal before actually importing.
 * @param {Event} e - The file input change event.
 * @returns {Promise<void>}
 */
async function importJSON(e) {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!Array.isArray(data)) throw new Error(t('importExpectedArray'));

        const valid = data.filter(item => item && item.text);
        if (!valid.length) throw new Error(t('importNoValidItems'));

        showImportPreview(valid);
    } catch (err) {
        toast(t('toastImportError', {message: err.message}));
    }
}

const IMPORT_PREVIEW_COUNT = 5;
const IMPORT_BATCH_SIZE = 20;

/** Set to true by the Stop button; checked between batches in runImport(). */
let importStopRequested = false;

/**
 * Shows a modal with a truncated preview of the quotes about to be imported,
 * letting the user confirm or cancel before any network calls are made.
 * @param {Array<Object>} items - Parsed quote objects with at least a `text` field.
 */
function showImportPreview(items) {
    const preview = items.slice(0, IMPORT_PREVIEW_COUNT);
    const remaining = items.length - preview.length;

    const rows = preview.map(item => `
        <div class="import-preview-row">
            <p class="import-preview-text">${escHtml(item.text)}</p>
            ${(item.author || item.source) ? `
                <p class="import-preview-meta">
                    ${item.author ? `<span class="quote-card-author">${escHtml(item.author)}</span>` : ''}
                    ${item.author && item.source ? '<span class="import-preview-meta-sep"> — </span>' : ''}
                    ${item.source ? `<span class="quote-card-source">${escHtml(item.source)}</span>` : ''}
                </p>
            ` : ''}
        </div>
    `).join('');

    const body = `
        <p class="import-preview-summary">${t('importPreviewSummary', {count: items.length, word: quoteCountWord(items.length)})}</p>
        <div class="import-preview-list">${rows}</div>
        ${remaining > 0 ? `<div class="import-preview-more">${t('importPreviewMore', {count: remaining, word: quoteCountWord(remaining)})}</div>` : ''}
    `;

    showModal(t('importPreviewTitle'), body, [
        {label: t('cancelButton'), cls: 'btn-secondary', id: 'import-cancel-btn', action: () => {
            if (modalBusy) {
                importStopRequested = true;
                document.getElementById('import-cancel-btn').disabled = true;
            } else {
                closeModal();
            }
        }},
        {label: t('importPreviewConfirm', {count: items.length, word: quoteCountWord(items.length)}), cls: 'btn-primary', id: 'import-confirm-btn', action: () => runImport(items)}
    ], true);
}

/**
 * Renders the spinner + live counter into the import confirm button.
 * @param {number} current - Quotes created so far.
 * @param {number} total - Total quotes to import.
 */
function setImportProgress(current, total) {
    const btn = document.getElementById('import-confirm-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-spinner-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${t('importProgressLabel', {current, total})}`;
}

/**
 * Splits an array into consecutive chunks of at most `size` items.
 * @param {Array} arr
 * @param {number} size
 * @returns {Array<Array>}
 */
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

/**
 * Replaces the preview modal with a final summary and a single Close button.
 * @param {number} added - Quotes actually created.
 * @param {number} total - Quotes that were queued for import.
 * @param {'done'|'stopped'|'error'} outcome
 * @param {number} skipped - Quotes rejected by server-side validation (e.g. too long).
 */
function showImportSummary(added, total, outcome, skipped) {
    const key = outcome === 'stopped' ? 'importSummaryStopped'
        : outcome === 'error' ? 'importSummaryError'
        : 'importSummaryDone';

    const body = `
        <p class="import-preview-summary">${t(key, {count: added, total, word: quoteCountWord(added)})}</p>
        ${skipped > 0 ? `<p class="import-preview-summary">${t('importSummarySkipped', {count: skipped, word: quoteCountWord(skipped)})}</p>` : ''}
    `;

    showModal(t('importPreviewTitle'), body, [
        {label: t('closeButton'), cls: 'btn-primary', action: closeModal}
    ], true);
}

/**
 * Creates the previewed quotes via the batch API, in chunks, after the user has confirmed
 * the import. Supports being stopped mid-way (the in-flight batch always finishes first).
 * @param {Array<Object>} items - Parsed quote objects to create.
 * @returns {Promise<void>}
 */
async function runImport(items) {
    const total = items.length;
    let added = 0;
    let skipped = 0;
    let outcome = 'done';

    importStopRequested = false;
    modalBusy = true;
    document.getElementById('import-cancel-btn').textContent = t('importStopBtn');
    setImportProgress(added, total);

    for (const chunk of chunkArray(items, IMPORT_BATCH_SIZE)) {
        if (importStopRequested) {
            outcome = 'stopped';
            break;
        }

        const payloads = chunk.map(item => ({
            text: item.text,
            author: item.author || '',
            source: item.source || '',
            tags: Array.isArray(item.tags) ? tagsToCsv(item.tags) : (item.tags || ''),
            fav: false,
            added: item.added || Date.now()
        }));

        try {
            const res = await Api.createBatch(payloads);
            if (!res.ok) {
                outcome = 'error';
                break;
            }

            const saved = await res.json();
            saved.forEach(q => {
                q.tags = q.tags ? q.tags.split(',').filter(Boolean) : [];
                quotes.push(q);
            });
            added += saved.length;
            skipped += payloads.length - saved.length;
            setImportProgress(added, total);
        } catch (e) {
            console.error('Batch import error:', e);
            outcome = 'error';
            break;
        }
    }

    modalBusy = false;
    showImportSummary(added, total, outcome, skipped);
}

/**
 * Exports the current quotes array as a downloadable JSON file.
 */
function exportJSON() {
    const data = quotes.map(q => ({text: q.text, author: q.author, source: q.source, tags: q.tags, fav: q.fav}));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `epigraph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

/**
 * Copies every quote to the clipboard as a plain-text block.
 */
function copyAll() {
    const text = quotes.map(q => formatQuoteAsText(q)).join('\n\n');
    const btn = document.getElementById('copy-all-btn');

    navigator.clipboard.writeText(text).then(() => {
        toast(t('toastCopied'));

        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> ${t('copiedButtonLabel')}`;
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = original;
                btn.disabled = false;
            }, 2000);
        }
    }).catch(() => toast(t('toastCopyError')));
}

/**
 * Prompts the user for confirmation and deletes every quote.
 */
function confirmClear() {
    const phrase = t('deleteAllConfirmPhrase');
    showModal(
        t('deleteAllModalTitle'),
        `${t('deleteAllModalBody', {count: quotes.length})}
         <p style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted)">
             ${t('deleteConfirmHint')}<br><strong>${phrase}</strong>
         </p>
          <input id="delete-confirm-input" class="modal-confirm-input"
                placeholder="${t('deleteAllConfirmPlaceholder')}"
                                oninput="
                    var btn = document.getElementById('modal-delete-btn');
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
                id: 'modal-delete-btn',
                action: async () => {
                    try {
                        await Api.deleteAll();
                        quotes = [];
                        renderList();
                        closeModal();
                        toast(t('toastAllQuotesDeleted'));
                    } catch (e) {
                        toast(t('toastError'));
                    }
                }
            }
        ]
    );

    // Disable button until phrase is typed
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const btn = document.getElementById('modal-delete-btn');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.style.opacity = '0.45';
            btn.style.pointerEvents = 'none';
        }
    }));
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
