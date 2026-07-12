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
// COPY QUOTE TEXT
// Same text format as the main app's formatQuoteAsText() (ui.js), read from
// the JSON data block the server embeds alongside the rendered card.
// =============================================================================
function initShareCopyButton() {
    const btn = document.getElementById('share-copy-btn');
    const dataEl = document.getElementById('share-quote-json');
    if (!btn || !dataEl) return;

    let quote;
    try {
        quote = JSON.parse(dataEl.textContent);
    } catch (e) {
        return;
    }

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
    initShareCopyButton();
    initShareAddButton();
});
