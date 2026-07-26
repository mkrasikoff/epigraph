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
     * Creates a batch of quotes in a single request — used by bulk imports to avoid
     * one HTTP round-trip (and DB transaction) per quote.
     * @param {Object[]} payloads - Array of quote data objects.
     * @returns {Promise<Response>}
     */
    createBatch: (payloads) =>
        fetch(`${API}/batch`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payloads)
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
     * Creates (or, on repeat calls for the same quote, fetches) a public share
     * link for a single quote. See SharedQuoteController.
     * @param {number|string} id - Quote identifier.
     * @returns {Promise<{token: string}>}
     */
    shareQuote: (id) =>
        fetch(`${API}/${id}/share`, { method: 'POST', headers: authHeaders() })
            .then(r => r.json()),

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
        }),

    /**
     * Updates the authenticated user's avatar icon (one of a fixed set of presets).
     * @param {string} avatarIcon
     * @returns {Promise<Response>}
     */
    updateAvatar: (avatarIcon) =>
        fetch('/api/user/me/avatar', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ avatarIcon })
        }),

    /**
     * Updates the authenticated user's interface language preference.
     * @param {string} preferredLanguage - 'ru' or 'en'.
     * @returns {Promise<Response>}
     */
    updatePreferredLanguage: (preferredLanguage) =>
        fetch('/api/user/me/language', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ preferredLanguage })
        }),

    /**
     * Updates the authenticated user's visual theme style (one of a fixed set of presets).
     * @param {string} themeStyle
     * @returns {Promise<Response>}
     */
    updateThemeStyle: (themeStyle) =>
        fetch('/api/user/me/theme', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ themeStyle })
        }),

    /**
     * Updates how much of the user's collection an accepted friend may see.
     * @param {'none'|'favorites'|'all'} quotesVisibility
     * @returns {Promise<Response>}
     */
    updateQuotesVisibility: (quotesVisibility) =>
        fetch('/api/user/me/quotes-visibility', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ quotesVisibility })
        }),

    /**
     * Activates an Epigraph Plus redeem code for the authenticated user (TASK-131).
     * @param {string} code
     * @returns {Promise<Response>}
     */
    redeem: (code) =>
        fetch('/api/user/me/redeem', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ code })
        }),

    /**
     * Fetches the authenticated user's achievement catalog with per-user
     * progress/unlock state. Called lazily — only when the Achievements
     * screen is opened, never at app bootstrap.
     * @returns {Promise<Object[]>}
     */
    getAchievements: () =>
        fetch('/api/achievements/me', { headers: authHeaders() }).then(r => r.json()),

    /**
     * Recent activity dates (ISO "yyyy-MM-dd" strings, ~last 4 months) for the stats-screen
     * activity heatmap (TASK-136). Lazy — only fetched when a Plus user opens the stats screen.
     * @returns {Promise<string[]>}
     */
    getActivityDays: () =>
        fetch('/api/achievements/activity-days', { headers: authHeaders() }).then(r => r.json()),

    /**
     * Community distribution snapshot for the "Место в сообществе" Plus card (TASK-136).
     * Anonymous aggregates only — same payload for every user. Lazy — fetched once when a
     * Plus user opens the stats screen.
     * @returns {Promise<Object>} { cohortSize, updatedAt, sizePercentiles, activityPercentiles, favPctPercentiles }
     */
    getCommunityStats: () =>
        fetch('/api/stats/community', { headers: authHeaders() }).then(r => r.json()),

    /**
     * Records the "explorer" achievement's change_theme action from the
     * light/dark appearance toggle. No body — see AchievementController.
     * @returns {Promise<Response>}
     */
    recordAppearanceToggle: () =>
        fetch('/api/achievements/appearance-toggle', {
            method: 'POST',
            headers: authHeaders()
        }),

    /**
     * The authenticated user's accepted friends (TASK-129).
     * @returns {Promise<Object[]>} User summaries, each with a `relation` field.
     */
    getFriends: () =>
        fetch(FRIENDS_API, { headers: authHeaders() }).then(r => r.json()),

    /**
     * Friend requests awaiting the authenticated user's answer.
     * @returns {Promise<Object[]>} User summaries of the requesters.
     */
    getFriendRequests: () =>
        fetch(`${FRIENDS_API}/requests`, { headers: authHeaders() }).then(r => r.json()),

    /**
     * Friend requests the authenticated user has sent and that are unanswered.
     * @returns {Promise<Object[]>} User summaries of the addressees.
     */
    getOutgoingFriendRequests: () =>
        fetch(`${FRIENDS_API}/requests/outgoing`, { headers: authHeaders() }).then(r => r.json()),

    /**
     * Searches users by display name. The backend returns nothing for queries
     * shorter than 2 characters, so callers don't need to pre-filter.
     * @param {string} query
     * @returns {Promise<Object[]>} User summaries, each with a `relation` field.
     */
    searchUsers: (query) =>
        fetch(`${FRIENDS_API}/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() })
            .then(r => r.json()),

    /**
     * Another user's public profile — no email, no quotes. Readable for any
     * signed-in user, since it's how you decide whether to send a request.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    getFriendProfile: (id) =>
        fetch(`${FRIENDS_API}/${id}/profile`, { headers: authHeaders() }),

    /**
     * A friend's quotes — how many come back depends on their own visibility
     * setting. 403 when the caller is not an accepted friend.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    getFriendQuotes: (id) =>
        fetch(`${FRIENDS_API}/${id}/quotes`, { headers: authHeaders() }),

    /**
     * Saves a friend's quote into the caller's own collection. Idempotent.
     * @param {number|string} quoteId - The friend's source quote id.
     * @returns {Promise<Response>}
     */
    saveFriendQuote: (quoteId) =>
        fetch(`${FRIENDS_API}/quotes/${quoteId}/save`, { method: 'POST', headers: authHeaders() }),

    /**
     * Sends a friend request. If that user had already requested the caller,
     * the backend collapses the two into an accepted friendship.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    sendFriendRequest: (id) =>
        fetch(`${FRIENDS_API}/requests/${id}`, { method: 'POST', headers: authHeaders() }),

    /**
     * Accepts a pending request received from the given user.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    acceptFriendRequest: (id) =>
        fetch(`${FRIENDS_API}/requests/${id}/accept`, { method: 'POST', headers: authHeaders() }),

    /**
     * Declines a pending request received from the given user.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    declineFriendRequest: (id) =>
        fetch(`${FRIENDS_API}/requests/${id}`, { method: 'DELETE', headers: authHeaders() }),

    /**
     * Removes a friend, or cancels the caller's own still-pending request.
     * @param {number|string} id
     * @returns {Promise<Response>}
     */
    removeFriend: (id) =>
        fetch(`${FRIENDS_API}/${id}`, { method: 'DELETE', headers: authHeaders() })

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
