/**
 * router.js — Hash-based routing for Epigraph.
 *
 * Maps URL hashes (#today, #all, #add, #settings) to views and drives switchView() on initial
 * load and on browser back/forward. Extracted from auth.js (TASK-127).
 *
 * Depends on:
 * - switchView()     {fn}       — defined in ui.js
 *
 * Provides (globals): getViewFromHash(), applyHashRoute().
 */

// =============================================================================
// HASH ROUTING
// Syncs browser URL hash with the active view and handles back/forward navigation.
// Supported hashes: #today, #all, #add, #settings
// =============================================================================
/** Maps URL hashes to view identifiers. */
const HASH_TO_VIEW = {
    '#today':    'qod',
    '#all':      'list',
    '#add':      'add',
    '#settings': 'settings',
};

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
    switchView(getViewFromHash());
}

// Handle browser back / forward buttons
window.addEventListener('hashchange', applyHashRoute);
