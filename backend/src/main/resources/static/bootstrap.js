/**
 * bootstrap.js — Application bootstrap and global input handlers for Epigraph.
 *
 * Runs the async startup IIFE (loads the banner, handles OAuth/reset tokens, restores
 * sort preference, fetches the user's quotes or falls back to guest mode, then renders
 * the initial view). Also registers global input handlers: blur-on-click cleanup, the
 * auth-screen Enter shortcut, and left/right arrow navigation for the QoD card.
 *
 * Must be loaded last, after state.js, guest-quotes.js, swipe.js, and the other
 * front-end modules whose functions it calls.
 *
 * Depends on:
 * - API              {string}   — defined in state.js
 * - quotes           {Array}    — defined in state.js
 * - currentSort      {string}   — defined in state.js
 * - isGuest          {boolean}  — defined in auth.js
 * - loadBanner()              {fn}  — defined in auth.js
 * - handleResetTokenFromUrl() {fn}  — defined in auth.js
 * - showGuestMode()           {fn}  — defined in auth.js
 * - hideGuestMode()           {fn}  — defined in auth.js
 * - getToken()                {fn}  — defined in auth.js
 * - setToken()                {fn}  — defined in auth.js
 * - clearToken()              {fn}  — defined in auth.js
 * - authHeaders()             {fn}  — defined in auth.js
 * - applyHashRoute()          {fn}  — defined in auth.js
 * - hideLoadingOverlay()      {fn}  — defined in auth.js
 * - authSubmit()              {fn}  — defined in auth.js
 * - SORT_LABELS      {Object}  — defined in quotes.js
 * - randomQuote()    {fn}      — defined in quotes.js
 * - initNotifications()       {fn}  — defined in notifications.js
 */

// =============================================================================
// INIT
// Application bootstrap — loads data then renders the initial QoD view.
// =============================================================================
(async () => {
    loadBanner();

    // If Google OAuth — token inside query-param
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
        setToken(urlToken);
        // Remove token from URL
        window.history.replaceState({}, document.title, '/');
    }

    // If password-reset link — handle before normal auth flow
    const resetHandled = await handleResetTokenFromUrl();
    if (resetHandled) {
        // The modal is open, show guest mode in background and wait
        showGuestMode();
        window.history.replaceState(null, '', '#today');
        return;
    }

    const token = getToken();

    // Restore sort preference
    try {
        const savedSort = localStorage.getItem('epigraph_sort');
        if (savedSort && SORT_LABELS[savedSort]) {
            currentSort = savedSort;
            const label = document.getElementById('sort-btn-label');
            if (label) label.textContent = SORT_LABELS[savedSort];
            document.querySelectorAll('.sort-menu-item').forEach(item => {
                item.classList.toggle('active', item.dataset.sort === savedSort);
            });
        }
    } catch (e) {
    }

    if (!token) {
        showGuestMode();
        // Guests can only see QoD — clear any hash that would open a locked section
        window.history.replaceState(null, '', '#today');
        return;
    }

    try {
        const res = await fetch(API, {headers: authHeaders()});
        if (res.status === 401 || res.status === 403) {
            clearToken();
            showGuestMode();
            return;
        }
        const rawQuotes = await res.json();
        quotes = rawQuotes.map(q => ({...q, tags: tagsFromCsv(q.tags)}));
        hideGuestMode();

        // Navigate to the section matching the URL hash (or default to QoD)
        applyHashRoute();

        initNotifications();
        hideLoadingOverlay();
    } catch (e) {
        console.error('[Init] Failed to load data, falling back to guest mode:', e);
        showGuestMode();
    }
})();

// Remove focus outline after mouse click
document.addEventListener('mousedown', e => {
    const btn = e.target.closest('button, [role="button"]');
    if (btn && !btn.classList.contains('tag-add-btn')) {
        btn.addEventListener(
            'click', () => document.activeElement?.blur(), {once: true}
        );
    }
});

// Global Enter handler for auth screen
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.getElementById('auth-screen').classList.contains('visible')) {
        e.preventDefault();
        authSubmit();
    }
});

// Keyboard navigation for QOD card — left/right arrows trigger random quote
document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const view = document.getElementById('view-qod');
    if (!view || !view.classList.contains('active')) return;
    if (isGuest || quotes.length > 0) randomQuote();
});
