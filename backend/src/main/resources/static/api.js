/**
 * api.js — Backend communication layer for Epigraph.
 *
 * Depends on:
 * - API {string} — base quotes endpoint constant, defined in index.html
 * - authHeaders() {fn} — returns request headers with auth token, defined in index.html (auth.js in future)
 *
 * Exposes a single global object `Api` with methods for CRUD operations on quotes.
 */

const Api = {

    /**
     * Fetches all quotes for the authenticated user.
     * @returns {Promise<Object[]>} Array of raw quote objects from the server.
     */
    getAll: () =>
        fetch(API, { headers: authHeaders() }).then(r => r.json()),

    /**
     * Fetches the Quote of the Day for the authenticated user from the backend.
     * The backend is the single source of truth for QoD selection (Europe/Moscow date).
     * @returns {Promise<Object|null>} Raw quote object, or null when the user has no quotes.
     */
    getQod: () =>
        fetch(`${API}/qod`, { headers: authHeaders() })
            .then(r => r.status === 204 ? null : r.json()),

    /**
     * Creates a new quote on the backend.
     * @param {Object} payload - Quote data (text, author, source, tags, fav, added).
     * @returns {Promise<Response>}
     */
    create: (payload) =>
        fetch(API, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        }),

    /**
     * Updates an existing quote by ID.
     * @param {number|string} id - Quote identifier.
     * @param {Object} payload - Updated quote data.
     * @returns {Promise<Response>}
     */
    update: (id, payload) =>
        fetch(`${API}/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(payload)
        }),

    /**
     * Deletes a single quote by ID.
     * @param {number|string} id - Quote identifier.
     * @returns {Promise<Response>}
     */
    delete: (id) =>
        fetch(`${API}/${id}`, { method: 'DELETE', headers: authHeaders() }),

    /**
     * Deletes all quotes for the authenticated user.
     * @returns {Promise<Response>}
     */
    deleteAll: () =>
        fetch(API, { method: 'DELETE', headers: authHeaders() }),

    /**
     * Fetches the authenticated user's own profile (id, email, username).
     * @returns {Promise<Object|null>} Profile object, or null on failure/guest.
     */
    getMe: () =>
        fetch(`${AUTH_API}/me`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null),

    /**
     * Updates the authenticated user's display username.
     * @param {string} username
     * @returns {Promise<Response>}
     */
    updateUsername: (username) =>
        fetch('/api/user/me/username', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ username })
        })

};

/**
 * Loads all user quotes from the backend and normalises their tags from a CSV
 * string into an array. On failure, the function resets the local quotes array.
 * @returns {Promise<void>}
 */
async function loadData() {
    try {
        const rawQuotes = await Api.getAll();
        quotes = rawQuotes.map(q => ({
            ...q,
            tags: tagsFromCsv(q.tags)
        }));
    } catch (e) {
        console.error('Load error:', e);
        quotes = [];
    }
}
