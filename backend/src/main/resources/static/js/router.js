/**
 * router.js — Hash-based routing for Epigraph.
 *
 * Maps URL hashes (#today, #all, #add, #settings, #friends) to views and drives switchView() on
 * initial load and on browser back/forward. Extracted from auth.js (TASK-127).
 *
 * Depends on:
 * - switchView()     {fn}       — defined in ui.js
 *
 * Provides (globals): getViewFromHash(), applyHashRoute().
 */

// =============================================================================
// HASH ROUTING
// Syncs browser URL hash with the active view and handles back/forward navigation.
// Supported hashes: #today, #all, #add, #settings, #friends
// =============================================================================
/** Maps URL hashes to view identifiers. */
const HASH_TO_VIEW = {
    '#today':    'qod',
    '#all':      'list',
    '#add':      'add',
    '#settings': 'settings',
    '#friends':  'friends',
};

/**
 * A friend's profile page (TASK-129) — the one parameterised route, so it can't
 * live in the static HASH_TO_VIEW map above.
 */
const FRIEND_PROFILE_HASH = /^#u\/(\d+)$/;

/**
 * Returns the view id for the current window.location.hash,
 * falling back to 'qod' for unknown or empty hashes.
 * @returns {string}
 */
function getViewFromHash() {
    return HASH_TO_VIEW[window.location.hash] || 'qod';
}

/**
 * Navigates to the view matching the current URL hash.
 * Called on hashchange (back/forward) and on initial load.
 */
function applyHashRoute() {
    const friendProfile = FRIEND_PROFILE_HASH.exec(window.location.hash);
    if (friendProfile) {
        // skipHistory — the hash already points here, so pushing again would
        // add a duplicate entry and trap the back button.
        openFriendProfile(friendProfile[1], true);
        return;
    }

    switchView(getViewFromHash());
}

// Handle browser back / forward buttons
window.addEventListener('hashchange', applyHashRoute);
