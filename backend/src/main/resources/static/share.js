/**
 * share.js — standalone public share page (/s/{token}).
 *
 * Loaded only by share-template.html, not by index.html — this page is a small
 * independent entry point separate from the main SPA (see TASK-125 plan).
 * The quote content itself is rendered server-side by SharePageController;
 * this script only wires up the interactive "add to collection" button.
 *
 * Depends on:
 * - t() / TRANSLATIONS / applyI18n() {fn} — defined in i18n.js
 */

const SHARE_TOAST_DISPLAY_MS = 2600;
const SHARE_TOAST_FADE_MS = 200;

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
                setButtonState(btn, 'imported');
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

function setButtonState(btn, state) {
    btn.disabled = state !== 'ready' && state !== 'loginRequired';
    if (state === 'imported') {
        btn.textContent = t('shareAlreadyImported');
        btn.disabled = true;
    } else if (state === 'loginRequired') {
        btn.textContent = t('shareLoginRequired');
        btn.disabled = false;
    } else {
        btn.textContent = t('shareAddButton');
        btn.disabled = false;
    }
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
            setButtonState(btn, 'imported');
            shareToast(t('shareImportSuccess'));
        })
        .catch(() => {
            btn.disabled = false;
            shareToast(t('shareImportError'), 'error');
        });
}

document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initShareAddButton();
});
