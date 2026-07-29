/**
 * friends.js — Friends screen for Epigraph (TASK-129).
 *
 * Renders the view reached from the account menu: search users by display
 * name, answer incoming requests, and see accepted friends. Every row's
 * buttons come from the `relation` field the backend stamps on each user
 * summary (NONE / OUTGOING / INCOMING / FRIENDS), so the client never infers
 * relationship state on its own.
 *
 * Usernames are user-supplied and not unique, so every one of them goes
 * through escHtml() before reaching innerHTML.
 *
 * Depends on:
 * - Api                   {Object} — api.js
 * - t(), apiErrorMessage() {fn}    — i18n.js
 * - toast(), escHtml()     {fn}    — ui.js
 * - avatarIconMarkup()     {fn}    — avatars.js
 * - badgePillMarkup()      {fn}    — achievements.js
 *
 * Provides (globals): renderFriendsView(), onFriendsSearchInput(),
 * friendAction(), openFriendProfile(), closeFriendProfile(),
 * exitFriendProfileMode(), showMoreFriendQuotes(), copyFriendQuote(),
 * saveFriendQuote().
 */

const FRIENDS_SEARCH_DEBOUNCE_MS = 300;

/**
 * Mirrors MIN_SEARCH_LENGTH in FriendshipService — the backend returns nothing
 * below it; matching here just avoids a pointless round-trip and lets us show
 * the "type at least N characters" hint.
 */
const FRIENDS_SEARCH_MIN_LENGTH = 2;

let friendsSearchTimer = null;

/**
 * Icons for the two affirmative actions ("add", "accept"). Only the primary
 * buttons carry one — giving the declining/removing buttons an icon too would
 * make a row read as a wall of controls.
 */
const FRIEND_ICON_USER_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
const FRIEND_ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

// =============================================================================
// PENDING-REQUEST BADGE (TASK-129)
// A count of live state, not a notification feed: the number *is* how many
// requests are unanswered, so answering one lowers it on its own and there is
// no read/unread flag to store anywhere. The header avatar only carries a dot
// ("something is waiting"); the number itself lives on the Friends row of the
// account menu, which is where the dot leads.
// =============================================================================
/**
 * Paints the badge from a known count.
 * @param {number} count
 */
function renderFriendRequestsBadge(count) {
    const dot = document.getElementById('account-badge-dot');
    if (dot) dot.style.display = count > 0 ? '' : 'none';

    const menuCount = document.getElementById('account-menu-friends-count');
    if (menuCount) {
        menuCount.style.display = count > 0 ? '' : 'none';
        menuCount.textContent = count;
    }
}

/**
 * Re-reads the count from the server. Called when the account menu opens, so
 * a request that arrived while the tab sat open still shows up without a
 * reload — and cheaply, since it only runs on an actual user gesture.
 */
async function refreshFriendRequestsBadge() {
    if (isGuest || !currentUser) return;

    try {
        const requests = await Api.getFriendRequests();
        renderFriendRequestsBadge(requests.length);
    } catch (e) {
        // A failed refresh leaves the last known count on screen — a badge is
        // not worth a visible error.
        console.error('Friend request badge refresh error:', e);
    }
}

/**
 * Entry point when the Friends view opens (see switchView). The search box is
 * deliberately *not* cleared: the common path here is search → open someone's
 * profile → come back, and wiping the query would make the user retype it every
 * time. The search is re-run instead, so its rows show current relations.
 */
async function renderFriendsView() {
    await refreshFriendsLists();
    await rerunFriendsSearch();
}

/**
 * Reloads incoming requests and the friends list. Called on view entry and
 * after every action, since accepting/declining/removing moves a user between
 * the two.
 */
async function refreshFriendsLists() {
    try {
        const [requests, outgoing, friends] = await Promise.all([
            Api.getFriendRequests(),
            Api.getOutgoingFriendRequests(),
            Api.getFriends()
        ]);

        renderFriendRequests(requests);
        renderOutgoingRequests(outgoing);
        renderFriendsList(friends);
        // Accepting or declining here changes the count, so keep the header in
        // sync without a second round-trip — we already have the list.
        renderFriendRequestsBadge(requests.length);
    } catch (e) {
        console.error('Friends load error:', e);
        toast(t('toastError'), 'error');
    }
}

/**
 * Last rendered signature per section. Entering #friends (including coming back
 * from a friend's profile) refetches all three lists for freshness, but the
 * common case is that nothing changed — re-writing identical innerHTML would
 * replay every row's entrance animation, the "flicker" that shows on every
 * visit. So a section is only re-rendered when its data actually differs.
 */
const friendsSectionSignatures = { requests: null, outgoing: null, friends: null };

/**
 * A stable key for a list's rendered output. Language is part of it because the
 * row markup contains translated button labels — a language switch must
 * invalidate the cache even though the raw data is unchanged.
 */
function friendsSectionSignature(data) {
    return currentLanguage + '|' + JSON.stringify(data);
}

function renderFriendRequests(requests) {
    const section = document.getElementById('friends-requests-section');
    const list = document.getElementById('friends-requests-list');
    if (!section || !list) return;

    const signature = friendsSectionSignature(requests);
    if (signature === friendsSectionSignatures.requests) return;
    friendsSectionSignatures.requests = signature;

    // The whole section disappears when there's nothing to answer — an empty
    // "Requests" heading reads as a bug rather than as a calm zero state.
    section.style.display = requests.length ? '' : 'none';
    list.innerHTML = requests.map(friendRowMarkup).join('');
}

/**
 * Requests the user has sent and that are still unanswered. Without this the
 * only trace of a sent request was the button state on the searched-for user,
 * which you had to find again to see or cancel it.
 */
function renderOutgoingRequests(outgoing) {
    const section = document.getElementById('friends-outgoing-section');
    const list = document.getElementById('friends-outgoing-list');
    if (!section || !list) return;

    const signature = friendsSectionSignature(outgoing);
    if (signature === friendsSectionSignatures.outgoing) return;
    friendsSectionSignatures.outgoing = signature;

    section.style.display = outgoing.length ? '' : 'none';
    list.innerHTML = outgoing.map(friendRowMarkup).join('');
}

function renderFriendsList(friends) {
    const list = document.getElementById('friends-list');
    if (!list) return;

    const signature = friendsSectionSignature(friends);
    if (signature === friendsSectionSignatures.friends) return;
    friendsSectionSignatures.friends = signature;

    list.innerHTML = friends.length
        ? friends.map(friendRowMarkup).join('')
        : `<div class="friends-empty">${t('friendsListEmpty')}</div>`;
}

/**
 * Debounced handler for the search box — one request per pause in typing
 * rather than one per keystroke.
 * @param {string} value
 */
function onFriendsSearchInput(value) {
    clearTimeout(friendsSearchTimer);
    friendsSearchTimer = setTimeout(() => runFriendsSearch(value), FRIENDS_SEARCH_DEBOUNCE_MS);
}

async function runFriendsSearch(query) {
    const box = document.getElementById('friends-search-results');
    if (!box) return;

    const trimmed = (query || '').trim();
    if (trimmed.length < FRIENDS_SEARCH_MIN_LENGTH) {
        // Nothing typed yet is a blank slate; one character is a half-finished
        // query, which earns the hint instead of a misleading "no one found".
        box.innerHTML = trimmed ? `<div class="friends-empty">${t('friendsSearchHint')}</div>` : '';
        return;
    }

    try {
        const results = await Api.searchUsers(trimmed);
        box.innerHTML = results.length
            ? results.map(friendRowMarkup).join('')
            : `<div class="friends-empty">${t('friendsSearchEmpty')}</div>`;
        // Eases the results in after the debounced fetch, matching the friend
        // profile's quotes block. Not on the sub-min-length hint above — that
        // renders per keystroke and would flicker.
        fadeInRise(box);
    } catch (e) {
        console.error('Friends search error:', e);
        toast(t('toastError'), 'error');
    }
}

/**
 * Re-runs the current search (if any) so its rows pick up the relation change
 * an action just made — otherwise a user you just added keeps showing "Add".
 */
function rerunFriendsSearch() {
    const input = document.getElementById('friends-search-input');
    if (input && input.value.trim().length >= FRIENDS_SEARCH_MIN_LENGTH) {
        return runFriendsSearch(input.value);
    }
    return Promise.resolve();
}

function friendRowMarkup(user) {
    const name = user.username || ('user' + user.id);

    return `
        <div class="friend-row">
            <button class="friend-row-main" onclick="openFriendProfile(${user.id})">
                <span class="friend-row-avatar">${avatarIconMarkup(user.avatarIcon)}</span>
                <span class="friend-row-body">
                    <span class="friend-row-name">@${escHtml(name)}</span>
                    ${badgePillMarkup(user.equippedBadge)}
                </span>
            </button>
            <span class="friend-row-actions">${friendActionsMarkup(user, false)}</span>
        </div>`;
}

/**
 * The action buttons for a user, chosen by the viewer's relation to them. One
 * source of truth for both the list rows and the profile page — `onProfile`
 * only changes where the refresh afterwards goes, not which buttons appear.
 *
 * OUTGOING and FRIENDS both route to the 'remove' action: the backend's remove
 * endpoint severs a pending request and an accepted friendship alike.
 */
function friendActionsMarkup(user, onProfile) {
    const call = (action) => `friendAction('${action}', ${user.id}, ${onProfile ? 'true' : 'false'})`;

    switch (user.relation) {
        case 'FRIENDS':
            return `<button class="friend-action-btn" onclick="${call('remove')}">${t('friendsRemoveBtn')}</button>`;
        case 'OUTGOING':
            // No "request sent" label next to the button: the toast already said
            // so, and the extra text shifted the button down on re-render.
            return `<button class="friend-action-btn" onclick="${call('remove')}">${t('friendsCancelBtn')}</button>`;
        case 'INCOMING':
            return `<button class="friend-action-btn friend-action-btn--primary" onclick="${call('accept')}">${FRIEND_ICON_CHECK}${t('friendsAcceptBtn')}</button>
                    <button class="friend-action-btn" onclick="${call('decline')}">${t('friendsDeclineBtn')}</button>`;
        default:
            return `<button class="friend-action-btn friend-action-btn--primary" onclick="${call('add')}">${FRIEND_ICON_USER_PLUS}${t('friendsAddBtn')}</button>`;
    }
}

/**
 * Runs a friend mutation and then refreshes whatever is on screen so no button
 * is left showing a stale relation: the lists and any active search, or — when
 * the action came from a friend's profile page — that profile.
 * @param {'add'|'accept'|'decline'|'remove'} action
 * @param {number} id - The other user.
 * @param {boolean} [fromProfile]
 */
async function friendAction(action, id, fromProfile) {
    const actions = {
        add:     [() => Api.sendFriendRequest(id),    'friendsToastRequestSent'],
        accept:  [() => Api.acceptFriendRequest(id),  'friendsToastAccepted'],
        decline: [() => Api.declineFriendRequest(id), 'friendsToastDeclined'],
        remove:  [() => Api.removeFriend(id),         'friendsToastRemoved']
    };
    const [request, successKey] = actions[action];

    try {
        const res = await request();
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            toast(apiErrorMessage(data, 'toastError'), 'error');
            return;
        }

        toast(t(successKey));

        if (fromProfile) {
            await openFriendProfile(id, true);
        } else {
            await refreshFriendsLists();
            await rerunFriendsSearch();
        }
    } catch (e) {
        console.error('Friend action error:', e);
        toast(t('toastError'), 'error');
    }
}

// =============================================================================
// FRIEND PROFILE — immersive page (TASK-129)
// A friend's page takes the whole screen and is painted in *their* theme style,
// while keeping the viewer's own light/dark mode. That's done by swapping
// data-theme-style on the document root (not data-theme), which is also what
// makes #theme-decor render that theme's real animated background — the decor
// is fixed and viewport-sized, so it can only work at the root, never scoped to
// a small element. The user's own style is restored on the way out; it is never
// written to localStorage or the account, so this is purely a view state.
// =============================================================================
/** The viewer's own theme style, held while a friend's page is open. */
let friendProfilePreviousThemeStyle = null;

/**
 * Opens a friend's profile page.
 * @param {number|string} id
 * @param {boolean} [skipHistory] - True when the URL hash already points here
 *   (initial load, back/forward, or a refresh after an action).
 */
async function openFriendProfile(id, skipHistory) {
    try {
        const res = await Api.getFriendProfile(id);
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            toast(apiErrorMessage(data, 'toastError'), 'error');
            switchView('friends');
            return;
        }

        const profile = await res.json();

        if (!skipHistory && window.location.hash !== '#u/' + id) {
            window.history.pushState(null, '', '#u/' + id);
        }

        enterFriendProfileMode(profile.themeStyle);
        renderFriendProfile(profile);
        showFriendProfileView();
    } catch (e) {
        console.error('Friend profile error:', e);
        toast(t('toastError'), 'error');
        switchView('friends');
    }
}

/** Leaves the friend's page, back to the friends list. */
function closeFriendProfile() {
    switchView('friends');
}

/**
 * Paints the app in the friend's theme style. Remembers the viewer's current
 * one on first entry only, so re-rendering the same page (after an action)
 * can't overwrite the saved value with the friend's style.
 * @param {string} [themeStyle]
 */
function enterFriendProfileMode(themeStyle) {
    const root = document.documentElement;

    if (friendProfilePreviousThemeStyle === null) {
        friendProfilePreviousThemeStyle = root.getAttribute('data-theme-style') || 'classic';
    }

    root.setAttribute('data-theme-style', THEME_STYLE_KEYS.includes(themeStyle) ? themeStyle : 'classic');
    document.body.classList.add('friend-immersive');
}

/**
 * Restores the viewer's own theme and chrome. Idempotent — switchView() calls
 * it on every navigation, so leaving a friend's page by any route (back button,
 * nav tab, account menu) always undoes the takeover.
 */
function exitFriendProfileMode() {
    if (friendProfilePreviousThemeStyle === null) return;

    document.documentElement.setAttribute('data-theme-style', friendProfilePreviousThemeStyle);
    friendProfilePreviousThemeStyle = null;
    document.body.classList.remove('friend-immersive');
}

function showFriendProfileView() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById('view-friend-profile').classList.add('active');
    moveNavIndicator();
    window.scrollTo(0, 0);
}

function renderFriendProfile(profile) {
    const name = profile.username || ('user' + profile.id);

    const body = document.getElementById('friend-profile-body');
    if (body) body.innerHTML = friendProfileMarkup(profile, name);

    renderFriendQuotesSection(profile, name);
}

// =============================================================================
// FRIEND QUOTES (TASK-129)
// Three states, chosen from the profile payload without an extra request: not
// friends at all, friends but sharing nothing, or friends with something to
// show. The dashed block stays in the first two — an empty page would read as
// broken, and this way the block explains the rule instead.
// =============================================================================
const FRIEND_QUOTES_PAGE_SIZE = 20;

/** The friend's quotes currently loaded, and how many of them are on screen. */
let friendQuotes = [];
let friendQuotesVisibleCount = 0;

/** Plays a soft fade-in-rise on a container whose contents were just populated
 *  from an async fetch (friend quotes list, friend search results), so they ease
 *  in instead of popping a beat after the rest of the view. Removing the class +
 *  forcing a reflow restarts the animation even on a re-render. */
function fadeInRise(el) {
    el.classList.remove('fade-in-rise');
    void el.offsetWidth;
    el.classList.add('fade-in-rise');
}

function friendQuotesNoticeMarkup(text) {
    return `
        <div class="friend-profile-locked">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>${text}</span>
        </div>`;
}

async function renderFriendQuotesSection(profile, name) {
    const box = document.getElementById('friend-profile-quotes');
    if (!box) return;

    friendQuotes = [];
    friendQuotesVisibleCount = 0;

    if (profile.relation !== 'FRIENDS') {
        box.innerHTML = friendQuotesNoticeMarkup(t('friendProfileQuotesNotFriends'));
        return;
    }
    if (profile.quotesVisibility === 'none') {
        box.innerHTML = friendQuotesNoticeMarkup(t('friendProfileQuotesHidden', { name: escHtml(name) }));
        return;
    }

    try {
        const res = await Api.getFriendQuotes(profile.id);
        if (!res.ok) {
            // Only reachable if the friendship changed under us mid-view.
            box.innerHTML = friendQuotesNoticeMarkup(t('friendProfileQuotesNotFriends'));
            fadeInRise(box);
            return;
        }

        friendQuotes = await res.json();
        friendQuotesVisibleCount = Math.min(FRIEND_QUOTES_PAGE_SIZE, friendQuotes.length);
        renderFriendQuotesList(true);
    } catch (e) {
        console.error('Friend quotes error:', e);
        box.innerHTML = friendQuotesNoticeMarkup(t('toastError'));
        fadeInRise(box);
    }
}

function renderFriendQuotesList(animate) {
    const box = document.getElementById('friend-profile-quotes');
    if (!box) return;

    if (!friendQuotes.length) {
        box.innerHTML = friendQuotesNoticeMarkup(t('friendProfileQuotesEmpty'));
        if (animate) fadeInRise(box);
        return;
    }

    const cards = friendQuotes.slice(0, friendQuotesVisibleCount).map(renderFriendQuoteCard).join('');
    const hasMore = friendQuotesVisibleCount < friendQuotes.length;

    box.innerHTML = `
        <div class="friend-profile-block-title">${t('friendProfileQuotesTitle')}</div>
        <div class="quotes-grid" id="friend-quotes-grid">${cards}</div>
        ${hasMore ? `<div class="list-load-more"><button type="button" class="btn-secondary" onclick="showMoreFriendQuotes()">${t('friendProfileQuotesMore')}</button></div>` : ''}`;

    // Reuse the collection's own two-up grid, clipping and expand-to-read
    // behaviour instead of a second implementation — markClippedCards() works
    // by class across the document, and initExpandableCards() now takes the
    // grid to bind (both live in quotes-list.js).
    markClippedCards();
    initExpandableCards(document.getElementById('friend-quotes-grid'));

    // Only on the first render (async settle), not on "show more" pagination —
    // re-fading the whole list every time you reveal a page would feel wrong.
    if (animate) fadeInRise(box);
}

/** Reveals the next page. A friend can have thousands of quotes — rendering
 *  them all at once would stall the page for no benefit. */
function showMoreFriendQuotes() {
    friendQuotesVisibleCount = Math.min(friendQuotesVisibleCount + FRIEND_QUOTES_PAGE_SIZE, friendQuotes.length);
    renderFriendQuotesList();
}

/**
 * Same card as "Мои цитаты" (renderQuoteCard in quotes-list.js) so the two read
 * identically — two-up grid, click-to-expand, tag chips. Read-only, though: the
 * owner's fav/edit/delete/share aren't the reader's to use, so the only action
 * is Copy. A "save to my collection" (+) button is planned for this same slot.
 * Tags are static here — tapping one can't search a collection that isn't yours.
 * @param {Object} quote - A FriendQuoteResponse (no owner id or fav flag).
 * @param {number} index
 */
function renderFriendQuoteCard(quote, index) {
    const tags = (quote.tags || '').split(',').map(tag => tag.trim()).filter(Boolean);

    return `
        <article class="quote-card" data-id="${quote.id}" style="animation-delay: ${Math.min(index * 40, 300)}ms">
          <div class="quote-card-text-wrap">
            <p class="quote-card-text">${escHtml(quote.text)}</p>
          </div>
          <span class="quote-card-expand-hint">${t('expandHintOpen')}</span>
          ${tags.length ? `<div class="quote-card-tags">${tags.map(tag => `<span class="quote-tag-chip quote-tag-chip--static">${escHtml(tag)}</span>`).join('')}</div>` : ''}
          <div class="quote-card-meta">
            <div>
              ${quote.author ? `<div class="quote-card-author">${escHtml(quote.author)}</div>` : ''}
              ${quote.source ? `<div class="quote-card-source">${escHtml(quote.source)}</div>` : ''}
            </div>
            <div class="quote-card-actions">
              ${friendSaveButtonMarkup(quote)}
              <button class="card-btn" onclick="copyFriendQuote(${quote.id})" aria-label="${t('ariaCopy')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
        </article>`;
}

const FRIEND_SAVE_ICON_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const FRIEND_SAVE_ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

/**
 * Save-to-my-collection control for a friend's quote. A clickable "+" when not
 * yet saved; once saved (from the payload's alreadySaved, or after a save) it
 * becomes a non-interactive check — saving is idempotent, so there's nothing to
 * do on a second press, and a live control would just invite a no-op.
 * @param {Object} quote
 */
function friendSaveButtonMarkup(quote) {
    if (quote.alreadySaved) {
        return `<span class="card-btn friend-save-btn friend-save-btn--saved" title="${t('friendQuoteSavedLabel')}" aria-label="${t('friendQuoteSavedLabel')}">${FRIEND_SAVE_ICON_CHECK}</span>`;
    }
    return `<button class="card-btn friend-save-btn" onclick="saveFriendQuote(${quote.id})" aria-label="${t('friendQuoteSaveAria')}">${FRIEND_SAVE_ICON_PLUS}</button>`;
}

/**
 * Saves a friend's quote into the viewer's collection, then flips just that
 * card's button to the saved state. The local copy is marked too, so paging in
 * more quotes (or any re-render) keeps it saved without a refetch.
 * @param {number} id
 */
async function saveFriendQuote(id) {
    try {
        const res = await Api.saveFriendQuote(id);
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            toast(apiErrorMessage(data, 'friendsErrorNotVisible'), 'error');
            return;
        }

        const quote = friendQuotes.find(q => q.id === id);
        if (quote) quote.alreadySaved = true;

        const btn = document.querySelector(`#friend-quotes-grid .quote-card[data-id="${id}"] .friend-save-btn`);
        if (btn) btn.outerHTML = friendSaveButtonMarkup({ alreadySaved: true });

        toast(t('friendQuoteSavedToast'));
    } catch (e) {
        console.error('Save friend quote error:', e);
        toast(t('toastError'), 'error');
    }
}

/** Copies a friend's quote. A separate handler from copyQuote() because that
 *  one looks the quote up in your own collection, which this one isn't in. */
function copyFriendQuote(id) {
    const quote = friendQuotes.find(q => q.id === id);
    if (!quote) return;

    navigator.clipboard.writeText(formatQuoteAsText(quote))
        .then(() => toast(t('toastCopied')))
        .catch(() => toast(t('toastError')));
}

function friendProfileMarkup(profile, name) {
    return `
        <div class="friend-profile-card">
            <div class="friend-profile-head">
                <span class="friend-profile-avatar">${avatarIconMarkup(profile.avatarIcon, 1.6)}</span>
                <span class="friend-profile-ident">
                    <span class="friend-profile-name-row">
                        <span class="friend-profile-name">@${escHtml(name)}</span>
                        ${profile.plus ? '<span class="friend-profile-plus">plus</span>' : ''}
                    </span>
                    ${badgePillMarkup(profile.equippedBadge)}
                </span>
            </div>

            <div class="friend-profile-meta">
                ${friendProfileMetaMarkup(profile)}
            </div>

            ${friendProfileAchievementsMarkup(profile.unlockedAchievements)}

            <div class="friend-profile-action">
                ${friendActionsMarkup({ id: profile.id, relation: profile.relation }, true)}
            </div>
        </div>

        <div id="friend-profile-quotes"></div>`;
}

function friendProfileMetaMarkup(profile) {
    const items = [];

    if (profile.memberSince) {
        items.push([
            '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            `${t('friendProfileSincePrefix')} ${monthYearGenitive(profile.memberSince)}`
        ]);
    }

    // Flame and quote-mark are the app's own glyphs — the flame is the
    // "week_streak" achievement icon, the quote mark is the header logo's.
    // Hand-drawing lookalikes here is how the quote icon ended up broken once.
    // A broken streak reads 0 (see AchievementService.currentStreak) and is
    // dropped rather than shown, same as on your own account card.
    if (profile.currentStreak > 0) {
        items.push([
            '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
            t('friendProfileStreak', { count: profile.currentStreak, word: dayCountWord(profile.currentStreak) })
        ]);
    }

    items.push([
        '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
        t('friendProfileQuotes', { count: profile.quoteCount, word: quoteCountWord(profile.quoteCount) })
    ]);

    return items.map(([path, label]) => `
        <span class="friend-profile-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>
            ${escHtml(label)}
        </span>`).join('');
}

/**
 * The strip of unlocked achievement icons, reusing the same icon markup the
 * achievements modal renders (ACHIEVEMENT_META). Hidden entirely when the user
 * hasn't unlocked anything — an empty heading reads as a bug.
 */
function friendProfileAchievementsMarkup(unlockedAchievements) {
    const icons = (unlockedAchievements || [])
        .filter(key => ACHIEVEMENT_META[key]?.icon)
        .map(key => {
            const title = t(achievementTitleKey(key));
            const description = t(achievementDescKey(key));

            // A <button> rather than a bare span: it's focusable everywhere,
            // including a tap on touch, which is what makes the hover tooltip
            // reachable without a phone-only fallback. It has no click action —
            // the label is the whole point.
            return `
                <span class="friend-profile-ach-item">
                    <button type="button" class="friend-profile-ach" aria-label="${escHtml(title)}">${ACHIEVEMENT_META[key].icon}</button>
                    <span class="achievement-info-tooltip" role="tooltip">
                        <span class="friend-profile-ach-name">${escHtml(title)}</span>
                        <span class="friend-profile-ach-desc">${description}</span>
                    </span>
                </span>`;
        })
        .join('');

    if (!icons) return '';

    return `
        <div class="friend-profile-block">
            <div class="friend-profile-block-title">${t('friendProfileAchievements')}</div>
            <div class="friend-profile-ach-strip">${icons}</div>
        </div>`;
}
