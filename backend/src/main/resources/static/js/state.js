/**
 * state.js — Application-wide constants, API endpoints, and mutable module-level state for Epigraph.
 *
 * Defines globals consumed across the other front-end modules (quotes.js, auth.js,
 * notifications.js, swipe.js, bootstrap.js).
 *
 * Must be loaded before any module that reads these globals.
 *
 * Depends on:
 * - (none) — this is the base state module, loaded first.
 *
 * Provides (globals):
 * - API                         {string}  — quotes REST endpoint
 * - AUTH_API                    {string}  — auth REST endpoint
 * - TOAST_DISPLAY_DURATION_MS   {number}
 * - TOAST_FADE_DURATION_MS      {number}
 * - QOD_ANIMATION_DEBOUNCE_MS   {number}
 * - FAVORITE_RERENDER_DELAY_MS  {number}
 * - AVATAR_SELECT_CLOSE_DELAY_MS {number} — delay before closeModal() after picking an avatar,
 *     so the selection bounce/badge animation has time to play
 * - AUTH_SUCCESS_FLASH_MS       {number}  — how long the login/register button shows a
 *     checkmark before hideAuthModal() runs
 * - quotes                      {Array}   — mutable quotes array
 * - currentFilter               {string}
 * - currentQodIndex             {number}
 * - qodAnchorId                 {number|null} — id of today's actual QoD quote (vs. one browsed to)
 * - editingId                   {number}
 * - currentSort                 {string}  — default sort
 * - currentUser                 {Object|null} — {id, email, username} of the logged-in user
 * - LIST_PAGE_SIZE              {number}  — quote-list "show more" batch size
 * - listVisibleCount            {number}  — how many of the filtered/sorted quotes are shown
 * - listRenderedCount           {number}  — how many cards are actually in the DOM right now
 */

const API = '/api/quotes';
const AUTH_API = '/api/auth';

const TOAST_DISPLAY_DURATION_MS = 2500;
const TOAST_FADE_DURATION_MS = 300;
const QOD_ANIMATION_DEBOUNCE_MS = 60;
const FAVORITE_RERENDER_DELAY_MS = 220;
const LIST_PAGE_SIZE = 100;
const AVATAR_SELECT_CLOSE_DELAY_MS = 340;
const AUTH_SUCCESS_FLASH_MS = 450;

let quotes = [];
let currentFilter = 'all';
let currentQodIndex = -1;
let qodAnchorId = null;
let editingId = null;
let currentSort = 'date_desc'; // default sort
let listVisibleCount = LIST_PAGE_SIZE;
let listRenderedCount = 0;

/** Cached profile of the logged-in user, loaded via Api.getMe(). Null for guests. */
let currentUser = null;

// =============================================================================
// TAG SERIALIZATION HELPERS
// Shared between api.js, bootstrap.js, and quotes.js — must live in state.js
// to guarantee load order before all consumers.
// =============================================================================

/**
 * Splits a comma-separated tag string from the backend into a clean array.
 * @param {string} [str]
 * @returns {string[]}
 */
function tagsFromCsv(str) {
    return str ? str.split(',').filter(Boolean) : [];
}

/**
 * Joins a tag array back into the comma-separated string the API expects.
 * @param {string[]} [arr]
 * @returns {string}
 */
function tagsToCsv(arr) {
    return (arr || []).join(',');
}

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

// Strict email — alphanumeric + allowed special chars; used by the login/register form.
const EMAIL_REGEX_STRICT = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Loose email — any non-whitespace/non-@ chars; used by register, forgot, and reset flows.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Password: ≥8 chars, ≥1 Latin or Cyrillic letter, ≥1 digit. No upper-bound cap.
const PASSWORD_REGEX = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*\d).{8,}$/;

// Username: 3–20 chars, Latin letters, digits, underscore only — mirrors UpdateUsernameRequest on the backend.
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
