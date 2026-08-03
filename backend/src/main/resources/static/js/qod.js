/**
 * qod.js — The "Quote of the Day" screen for Epigraph.
 *
 * Rendering, adaptive sizing, random/animated transitions, copy, favourite, and the backend
 * loader for the QoD card — the whole "На сегодня" view. Extracted from quotes.js and auth.js
 * (loadQod) as part of the TASK-127 refactor.
 *
 * Depends on:
 * - quotes / currentQodIndex / qodAnchorId {globals} — defined in state.js
 * - currentLanguage  {string}   — defined in i18n.js
 * - isGuest          {boolean}  — defined in auth.js
 * - Api              {Object}   — defined in api.js
 * - t()              {fn}       — defined in i18n.js
 * - toast() / formatQuoteAsText() / moveNavIndicator() {fn} — defined in ui.js
 * - tagsToCsv()      {fn}       — defined in state.js
 *
 * Provides (globals): renderQod(), renderQodAnimated(), randomQuote(), copyQod(),
 *   favQod(), updateFavQodButton(), loadQod().
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

    // The "На сегодня" tab only stays highlighted while looking at today's actual
    // quote — browsing away via Random/swipe fades it out (see moveNavIndicator() in ui.js).
    document.getElementById('tab-qod')?.classList.toggle('active', q.id === qodAnchorId);
    moveNavIndicator();

    const now = new Date();
    const dateLocale = currentLanguage === 'ru' ? 'ru-RU' : 'en-US';
    const dateStr = now.toLocaleDateString(dateLocale, {weekday: 'long', day: 'numeric', month: 'long'});
    document.getElementById('qod-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const textEl = document.getElementById('qod-text');

    // Update content synchronously so callers can measure the new card height immediately
    textEl.textContent = q.text;
    applyQodAdaptiveSize(q.text);
    document.getElementById('qod-author').textContent = q.author || '';
    document.getElementById('qod-source').textContent = q.source || '';
    updateFavQodButton();

    // Guests see tags on the demo card (see guest-landing.js); authed QoD hides them.
    if (isGuest) renderGuestQodTags(q);

    document.fonts.ready.then(() => {
        // Guests see the QoD card as one section of a taller, scrollable landing — never
        // lock scroll for them, even though the card alone would fit the viewport. The
        // fullscreen-fit lock stays exactly as-is for the authenticated QoD screen.
        if (isGuest) {
            document.body.classList.remove('no-scroll');
            return;
        }
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

    // Guests see a compact, fixed-size demo card (see guest-landing.js) instead of the
    // full adaptive/fullscreen sizing used on the authenticated QoD hero (TASK-135).
    if (isGuest) {
        card.classList.remove('qod-size-short', 'qod-size-medium', 'qod-size-long', 'qod-size-very-long');
        applyGuestQodSize(text);
        return;
    }

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
        {selector: '.qod-actions .btn-primary', msg: t('toastNoQuotesYet')},
        {selector: '.qod-actions .btn-secondary:not(#btn-fav-qod)', msg: t('toastNoQuotesYet')},
        {selector: '#btn-fav-qod', msg: t('toastNoQuotesYet')},
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

    // Guests get a plain cross-fade (no QoD collapse/expand animation, which fights the
    // fixed-size guest card) plus the dim-dots + idle-resume behaviour — see guest-landing.js.
    if (isGuest) {
        guestRandomQuote();
        return;
    }

    let idx;
    do {
        idx = Math.floor(Math.random() * quotes.length);
    } while (idx === currentQodIndex && quotes.length > 1);

    renderQodAnimated(idx);
}

/**
 * Same as renderQod(), but crossfades the card out and back in around the content swap instead
 * of updating it instantly — used whenever the QoD card is already on screen and about to show
 * different content (a random quote, or navigating back to "Today" from elsewhere), so the
 * change reads as a deliberate transition rather than a jump cut. Falls back to a plain
 * renderQod() when there's no existing card to animate from (e.g. the very first render).
 * @param {Object|number|null} [qodOrIdx] - Same argument renderQod() accepts.
 */
function renderQodAnimated(qodOrIdx) {
    const card = document.querySelector('.qod-card');
    if (!card) { renderQod(qodOrIdx); return; }

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
        renderQod(qodOrIdx);

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
        .then(() => {
            toast(t('toastCopied'));
            peelCopyIcon();
        })
        .catch(() => toast(t('toastCopyError')));
}

/**
 * Lifts and tilts the copy icon's front sheet, as if it peels off the stack
 * behind it, then settles back — a one-off flourish on successful copy.
 */
function peelCopyIcon() {
    const front = document.getElementById('qod-copy-front');
    if (!front) return;

    front.style.transform = 'translate(-3px, -3px) rotate(-6deg)';
    setTimeout(() => {
        front.style.transform = '';
    }, 260);
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
        updateFavQodButton(true);
    } catch (e) {
        q.fav = !q.fav;
        toast(t('toastError'));
    }
}

/**
 * Updates the QoD "favourite" button to reflect the current quote's fav state.
 * @param {boolean} [animate=false] - Crossfade the label instead of swapping it instantly —
 *   used when the user just toggled favourite on the same quote (favQod()). Left instant when
 *   a new quote is loading (renderQod()), since the label update there is one of many things
 *   changing at once and doesn't need its own separate transition.
 */
function updateFavQodButton(animate = false) {
    const q = quotes[currentQodIndex];
    const btn = document.getElementById('btn-fav-qod');
    const icon = document.getElementById('qod-fav-icon');
    const label = document.getElementById('qod-fav-label');

    if (!btn || !q || !icon || !label) return;

    if (btn.dataset.widthSyncLang !== currentLanguage) {
        syncFavButtonWidth(btn, label);
        btn.dataset.widthSyncLang = currentLanguage;
    }

    const isFav = !!q.fav;
    icon.setAttribute('fill', isFav ? 'currentColor' : 'none');
    btn.classList.toggle('is-active', isFav);

    const newText = isFav ? t('favActive') : t('favInactive');

    if (!animate || label.textContent.trim() === newText) {
        label.textContent = newText;
        return;
    }

    label.style.opacity = '0';
    setTimeout(() => {
        label.textContent = newText;
        label.style.opacity = '1';
    }, 140);
}

/**
 * Measures the button's rendered width under both possible labels (favActive/favInactive)
 * in the current language, and pins min-width to the wider of the two — a fixed guess can't
 * reliably survive translation or font differences (English "Add to favorites" vs "In
 * favorites" differ by a lot more than the Russian pair do), so this measures the real
 * layout instead. Swaps the label text twice synchronously (no paint happens in between,
 * so nothing flashes) then restores whatever was showing.
 * @param {HTMLElement} btn
 * @param {HTMLElement} label
 */
function syncFavButtonWidth(btn, label) {
    const originalText = label.textContent;

    btn.style.minWidth = '';
    label.textContent = t('favActive');
    const activeWidth = btn.getBoundingClientRect().width;
    label.textContent = t('favInactive');
    const inactiveWidth = btn.getBoundingClientRect().width;

    btn.style.minWidth = Math.ceil(Math.max(activeWidth, inactiveWidth)) + 'px';
    label.textContent = originalText;
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
 * @param {boolean} [animate=false] - Crossfade the card into the new content (see
 *   renderQodAnimated()) instead of updating it instantly — the caller decides this based on
 *   whether the card is already showing today's quote (see switchView() in ui.js).
 */
async function loadQod(animate) {
    const render = animate ? renderQodAnimated : renderQod;
    const CACHE_KEY = 'epigraph_qod_id';

    try {
        const cachedId = sessionStorage.getItem(CACHE_KEY);
        if (cachedId !== null) {
            const quote = quotes.find(q => q.id === Number(cachedId));
            if (quote) {
                qodAnchorId = quote.id;
                render(quote);
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
        render(qodQuote);
    } catch {
        qodAnchorId = null;
        render(null);
    }
}
