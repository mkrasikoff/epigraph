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
 * - quotes                      {Array}   — mutable quotes array
 * - currentFilter               {string}
 * - currentQodIndex             {number}
 * - editingId                   {number}
 * - currentSort                 {string}  — default sort
 */

const API = '/api/quotes';
const AUTH_API = '/api/auth';

const TOAST_DISPLAY_DURATION_MS = 2500;
const TOAST_FADE_DURATION_MS = 300;
const QOD_ANIMATION_DEBOUNCE_MS = 60;
const FAVORITE_RERENDER_DELAY_MS = 220;

let quotes = [];
let currentFilter = 'all';
let currentQodIndex = -1;
let editingId = null;
let currentSort = 'date_desc'; // default sort
