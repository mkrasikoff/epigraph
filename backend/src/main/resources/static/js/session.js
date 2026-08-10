/**
 * session.js — Session, token, and cross-device preference sync for Epigraph.
 *
 * JWT storage helpers, the authenticated request headers, loading the current user, syncing a
 * guest-chosen language/theme into the account at login, and logout. Extracted from auth.js
 * (TASK-127).
 *
 * Depends on:
 * - AUTH_API         {string}   — defined in state.js
 * - currentUser / currentLanguage / currentThemeStyle {globals} — defined in state.js / i18n.js / ui.js
 * - Api              {Object}   — defined in api.js
 * - t() / setLanguage() {fn}    — defined in i18n.js
 * - updateThemeStyleGrid() {fn} — defined in ui.js
 * - showGuestMode() {fn}        — defined in auth.js
 * - switchView() {fn}           — defined in ui.js
 *
 * Provides (globals): getToken(), setToken(), clearToken(), authHeaders(),
 *   loadCurrentUser(), syncPreferredLanguage(), syncPreferredTheme(), logout().
 */

// =============================================================================
// TOKEN + HEADERS
// JWT stored in localStorage; helpers to read/write/clear it and build request headers.
// =============================================================================
function getToken() {
    try {
        return localStorage.getItem('epigraph_token');
    } catch (e) {
        return null;
    }
}

function setToken(token) {
    try {
        localStorage.setItem('epigraph_token', token);
    } catch (e) {
    }
}

function clearToken() {
    try {
        localStorage.removeItem('epigraph_token');
    } catch (e) {
    }
}

function authHeaders() {
    const token = getToken();
    return token
        ? {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
        : {'Content-Type': 'application/json'};
}

// =============================================================================
// CURRENT USER
// =============================================================================
/**
 * Fetches the authenticated user's profile (id, email, username) and caches
 * it in `currentUser` for display in Settings > Account. No-ops to null on
 * failure — callers fall back to placeholder text.
 */
async function loadCurrentUser() {
    try {
        currentUser = await Api.getMe();
    } catch (e) {
        currentUser = null;
    }
    // Reflect avatar + Plus state in the header (TASK-132). Safe for the guest
    // path too — the account menu itself stays hidden via showGuestMode().
    if (typeof updateHeaderAccount === 'function') updateHeaderAccount();
}

// =============================================================================
// PREFERENCE SYNC + LOGOUT
// Carries a guest's in-session language/theme choice into their account at login,
// then tears the session down on logout.
// =============================================================================
/**
 * Reconciles the app's active language with the authenticated user's account
 * right after login/register/reset. If this device already has an explicit
 * language choice (the guest picked one, or it was set on a previous
 * session), that choice wins and is pushed to the account — this is how a
 * language picked on the guest screen "sticks" through registration/login
 * instead of being silently overwritten by whatever the account had stored.
 * Otherwise (a fresh device with no local choice), the account's stored
 * preference is pulled down and applied locally.
 */
async function syncPreferredLanguage() {
    if (!currentUser) return;

    let explicit = null;
    try {
        explicit = localStorage.getItem('epigraph_lang');
    } catch (e) {
    }

    const serverLang = currentUser.preferredLanguage;

    if (explicit && TRANSLATIONS[explicit] && explicit !== serverLang) {
        try {
            await Api.updatePreferredLanguage(explicit);
            currentUser.preferredLanguage = explicit;
        } catch (e) {
        }
    } else if (!explicit && serverLang) {
        setLanguage(serverLang);
    }
}

/** Max time to wait for /api/geo before the first guest render, so a slow lookup can't hold the
 * loading screen (see applyGuestGeoLanguage). On prod (Cloudflare header) the answer is near-instant. */
const GEO_LANG_TIMEOUT_MS = 700;

/**
 * Region-based default language for a guest (TASK-142). Awaited by bootstrap.js BEFORE the first
 * render and before the loading overlay is lifted, so the browser-locale→region correction happens
 * behind the loading screen — the visitor never sees a language flip. Sets 'ru' for the RU region,
 * 'en' for any other known region. Guests only, and only when there's no explicit choice yet
 * (localStorage empty) — an explicit toggle or a logged-in account preference always wins. Applied
 * WITHOUT persisting (persist=false), so it stays a soft default: never counted as the user's own
 * choice, never pushed onto an account at login.
 *
 * The /api/geo wait is capped: if the lookup is slow or fails, we keep the browser-locale guess
 * already in place rather than hold the loading screen open.
 */
async function applyGuestGeoLanguage() {
    if (currentUser) return;
    try {
        if (localStorage.getItem('epigraph_lang')) return;
    } catch (e) {
        return;
    }

    const country = await Promise.race([
        resolveCountry(),
        new Promise(resolve => setTimeout(() => resolve(null), GEO_LANG_TIMEOUT_MS)),
    ]);
    if (!country) return;                     // unknown / too slow — keep the locale-based guess

    const want = country === 'RU' ? 'ru' : 'en';
    if (want !== currentLanguage) {
        // Runs before the first guest render, so just set the language — showGuestMode() then
        // renders the QoD (and its language-specific sample quotes) in the corrected language.
        setLanguage(want, false);
    }
}

/**
 * Reconciles the app's active theme style with the authenticated user's
 * account right after login/register/reset — same "guest choice wins" shape
 * as syncPreferredLanguage() above, applied to the theme-style picker
 * instead of the language toggle. No page reload needed here since a style
 * switch is a pure CSS variable swap, not a text-reflow change.
 */
async function syncPreferredTheme() {
    if (!currentUser) return;

    let explicit = null;
    try {
        explicit = localStorage.getItem('themeStyle');
    } catch (e) {
    }

    const serverStyle = currentUser.themeStyle;

    if (explicit && THEME_STYLE_KEYS.includes(explicit) && explicit !== serverStyle) {
        try {
            await Api.updateThemeStyle(explicit);
            currentUser.themeStyle = explicit;
        } catch (e) {
        }
    } else if (!explicit && serverStyle) {
        document.documentElement.setAttribute('data-theme-style', serverStyle);
        try {
            localStorage.setItem('themeStyle', serverStyle);
        } catch (e) {
        }
        updateThemeStyleGrid();
    }
}

function logout() {
    clearToken();
    currentUser = null;
    // Drop this session's persisted theme/language so the next account to log in
    // isn't treated as a "guest with an explicit choice" — otherwise the previous
    // user's stored preference (written to localStorage by syncPreferredTheme /
    // syncPreferredLanguage) would win over the next user's account settings and,
    // worse, get pushed up onto their account. The "guest choice wins" pattern is
    // only meant for a genuine pre-login guest, not for leftovers of a prior session.
    try {
        localStorage.removeItem('themeStyle');
        localStorage.removeItem('epigraph_lang');
    } catch (e) {
    }
    showGuestMode();
    switchView('qod');
}
