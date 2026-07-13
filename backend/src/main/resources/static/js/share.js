/**
 * share.js — standalone public share page (/s/{token}).
 *
 * Loaded only by share-template.html, not by index.html — this page is a small
 * independent entry point separate from the main SPA (see TASK-125 plan).
 * The quote content itself is rendered server-side by SharePageController;
 * this script wires up the interactive bits (theme/language toggle, copy,
 * add-to-collection) using the same localStorage keys and behaviors as the
 * main app, without pulling in the SPA's auth.js/api.js/quotes.js.
 *
 * Depends on:
 * - t() / TRANSLATIONS / applyI18n() / setLanguage() {fn} — defined in i18n.js
 * - THEME_STYLE_KEYS {string[]} — defined in themes.js
 */

const SHARE_TOAST_DISPLAY_MS = 2600;
const SHARE_TOAST_FADE_MS = 200;
const SHARE_HIGHLIGHT_STORAGE_KEY = 'epigraph_highlight_quote_id';

function shareToast(msg, type) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;

    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), SHARE_TOAST_FADE_MS);
    }, SHARE_TOAST_DISPLAY_MS);
}

function shareGetToken() {
    try {
        return localStorage.getItem('epigraph_token');
    } catch (e) {
        return null;
    }
}

function shareAuthHeaders() {
    const token = shareGetToken();
    return token
        ? {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
        : {'Content-Type': 'application/json'};
}

/**
 * Reads the quote data SharePageController embeds in a JSON <script> block
 * alongside the rendered card — shared by the copy button and the adaptive
 * card-sizing logic so both work off one parse. Returns null on the
 * not-found page (no data block) or if parsing fails.
 */
function shareReadQuoteData() {
    const dataEl = document.getElementById('share-quote-json');
    if (!dataEl) return null;

    try {
        return JSON.parse(dataEl.textContent);
    } catch (e) {
        return null;
    }
}

// =============================================================================
// LOGO ANIMATION
// Same draw-in / flip flourishes as the main app's header (ui.js) — ported
// rather than imported since ui.js assumes the full SPA is loaded around it.
// =============================================================================
function drawLogoIcon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const paths = document.querySelectorAll('#logo-icon path');
    if (!paths.length) return;

    const lengths = [...paths].map(path => path.getTotalLength());

    paths.forEach((path, i) => {
        path.style.strokeDasharray = String(lengths[i]);
        path.style.strokeDashoffset = String(lengths[i]);
    });

    requestAnimationFrame(() => {
        paths.forEach((path, i) => {
            path.style.transition = `stroke-dashoffset 600ms ease ${i * 100}ms`;
            path.style.strokeDashoffset = '0';
        });
    });

    setTimeout(() => {
        paths.forEach(path => {
            path.style.transition = '';
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
        });
    }, 600 + paths.length * 100 + 20);
}

function flipLogoIcon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const icon = document.getElementById('logo-icon');
    if (!icon) return;

    const deg = (parseFloat(icon.dataset.flipDeg) || 0) + 180;
    icon.dataset.flipDeg = String(deg);
    icon.style.transform = `rotateY(${deg}deg)`;
}

// =============================================================================
// ENTRANCE ANIMATION
// Same "entry" phase randomQuote() (quotes.js) plays after swapping in a new
// QoD quote — ported here as a one-time entrance for the card on load, since
// this page has no previous quote to collapse away from, only the fade/slide
// reveal of the new one. Durations are deliberately longer than the QoD
// original (380ms/440ms) — this plays once on a page the visitor is landing
// on cold, rather than after a button click they just triggered, so a more
// unhurried pace reads better here.
// =============================================================================
function animateShareCardEntrance() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const card = document.querySelector('.qod-card');
    if (!card) return;

    card.style.transition = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px) scale(0.97)';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.style.transition = 'opacity 650ms ease-out, transform 750ms cubic-bezier(0.16, 1, 0.3, 1)';
            card.style.opacity = '1';
            card.style.transform = '';

            setTimeout(() => {
                card.style.transition = '';
                card.style.opacity = '';
                card.style.transform = '';
            }, 770);
        });
    });
}

// =============================================================================
// ADAPTIVE CARD SIZE
// Same width/font-size heuristic as the QoD screen's applyQodAdaptiveSize()
// (quotes.js) — ported onto this page's own card/text ids so a long shared
// quote gets a wider card and smaller font instead of clipping, matching
// the reading experience of the main app rather than a fixed-size box.
// =============================================================================
function applyShareCardAdaptiveSize(text) {
    const card = document.querySelector('.qod-card');
    const el = document.getElementById('share-quote-text');
    if (!card || !el || !text) return;

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

// =============================================================================
// THEME / LANGUAGE TOGGLES
// Same localStorage keys as the main app (ui.js), simplified — no icon
// rotation animation, no achievement recording, since this page is a
// lightweight satellite rather than part of the SPA session.
// =============================================================================
function shareUpdateThemeIcon(btn, mode) {
    if (mode === 'dark') {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    } else {
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
}

function initShareThemeToggle() {
    const btn = document.getElementById('share-theme-toggle');
    if (!btn) return;

    shareUpdateThemeIcon(btn, document.documentElement.getAttribute('data-theme'));

    btn.addEventListener('click', () => {
        const html = document.documentElement;
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try {
            localStorage.setItem('theme', next);
        } catch (e) {
        }
        shareUpdateThemeIcon(btn, next);
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', next === 'dark' ? '#18160f' : '#f5f2ec');
    });
}

function initShareLangToggle() {
    const btn = document.getElementById('share-lang-toggle');
    if (!btn) return;

    btn.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
    btn.addEventListener('click', () => {
        setLanguage(currentLanguage === 'ru' ? 'en' : 'ru');
        btn.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
    });
}

// =============================================================================
// PUBLIC-QUOTE BADGE
// Icon-only "this is public, view-only" indicator — click toggles a short
// explanation tooltip (not hover, so it works the same on touch devices).
// =============================================================================
function initShareBadgeTooltip() {
    const btn = document.getElementById('share-badge-icon');
    const tooltip = document.getElementById('share-badge-tooltip');
    if (!btn || !tooltip) return;

    function close() {
        tooltip.classList.remove('visible');
        btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = !tooltip.classList.contains('visible');
        tooltip.classList.toggle('visible', opening);
        btn.setAttribute('aria-expanded', String(opening));
    });

    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });
}

// =============================================================================
// COPY QUOTE TEXT
// Same text format as the main app's formatQuoteAsText() (ui.js), read from
// the JSON data block the server embeds alongside the rendered card.
// =============================================================================
function initShareCopyButton(quote) {
    const btn = document.getElementById('share-copy-btn');
    if (!btn || !quote) return;

    btn.addEventListener('click', () => {
        let text = quote.text || '';
        if (quote.author) text += '\n— ' + quote.author;
        if (quote.source) text += '\n«' + quote.source + '»';

        navigator.clipboard.writeText(text)
            .then(() => shareToast(t('toastCopied')))
            .catch(() => shareToast(t('toastError'), 'error'));
    });
}

// =============================================================================
// ADD TO COLLECTION
// =============================================================================
function initShareAddButton() {
    const btn = document.getElementById('share-add-btn');
    if (!btn) return; // not-found page has no button

    const token = btn.dataset.token;

    if (!shareGetToken()) {
        setButtonState(btn, 'loginRequired');
        btn.addEventListener('click', () => {
            window.location.href = '/';
        });
        return;
    }

    // Logged in — check whether this visitor already imported this link before
    // showing the button, so a repeat visit doesn't invite a redundant click.
    fetch(`/api/shared/${token}`, {headers: shareAuthHeaders()})
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data && data.alreadyImported) {
                setButtonState(btn, 'imported', data.importedQuoteId);
                return;
            }

            setButtonState(btn, 'ready');
            btn.addEventListener('click', () => importSharedQuote(token, btn));
        })
        .catch(() => {
            setButtonState(btn, 'ready');
            btn.addEventListener('click', () => importSharedQuote(token, btn));
        });
}

function setButtonState(btn, state, importedQuoteId) {
    btn.onclick = null;

    if (state === 'imported') {
        btn.textContent = t('shareViewInCollection');
        btn.disabled = false;
        btn.onclick = () => goToImportedQuote(importedQuoteId);
    } else if (state === 'loginRequired') {
        btn.textContent = t('shareLoginRequired');
        btn.disabled = false;
    } else {
        btn.textContent = t('shareAddButton');
        btn.disabled = false;
    }
}

function goToImportedQuote(quoteId) {
    try {
        localStorage.setItem(SHARE_HIGHLIGHT_STORAGE_KEY, String(quoteId));
    } catch (e) {
    }
    window.location.href = '/#all';
}

function importSharedQuote(token, btn) {
    btn.disabled = true;

    fetch(`/api/shared/${token}/import`, {
        method: 'POST',
        headers: shareAuthHeaders()
    })
        .then(r => {
            if (!r.ok) throw new Error('import failed');
            return r.json();
        })
        .then(result => {
            setButtonState(btn, 'imported', result.quote.id);
            shareToast(t('shareImportSuccess'));
        })
        .catch(() => {
            btn.disabled = false;
            shareToast(t('shareImportError'), 'error');
        });
}

document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initShareThemeToggle();
    initShareLangToggle();
    drawLogoIcon();

    const quote = shareReadQuoteData();
    if (quote) applyShareCardAdaptiveSize(quote.text);
    animateShareCardEntrance();
    initShareBadgeTooltip();
    initShareCopyButton(quote);
    initShareAddButton();
});
