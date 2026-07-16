// =============================================================================
// THEME
// Theme toggle IIFE — reads saved preference, applies it, and wires the button.
// =============================================================================
(function () {
    const themeToggleBtn = document.querySelector('[data-theme-toggle]');
    const htmlElement = document.documentElement;

    let currentTheme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';

    try {
        const s = localStorage.getItem('theme');
        if (s) currentTheme = s;
    } catch (e) {
    }

    let currentThemeStyle = 'classic';
    try {
        const s = localStorage.getItem('themeStyle');
        if (s && THEME_STYLE_KEYS.includes(s)) currentThemeStyle = s;
    } catch (e) {
    }

    htmlElement.setAttribute('data-theme', currentTheme);
    htmlElement.setAttribute('data-theme-style', currentThemeStyle);
    updateThemeIcon(themeToggleBtn, currentTheme);
    updateThemeColorMeta(currentTheme);

    themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', currentTheme);
        try {
            localStorage.setItem('theme', currentTheme);
        } catch (e) {
        }
        animateThemeIcon(themeToggleBtn, currentTheme);
        updateThemeColorMeta(currentTheme);

        if (!isGuest) {
            Api.recordAppearanceToggle().then(() => checkForNewAchievements()).catch(() => {});
        }
    });

    /**
     * Updates the theme toggle button icon and aria-label for the current theme.
     * Instant swap, no animation — used for the initial render, and internally
     * by animateThemeIcon() once its "out" transition has finished.
     * @param {HTMLElement|null} btn - Theme toggle button.
     * @param {string} mode - Either 'dark' or 'light'.
     */
    function updateThemeIcon(btn, mode) {
        if (!btn) return;

        if (mode === 'dark') {
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
            btn.setAttribute('aria-label', t('ariaSwitchToLightTheme'));
        } else {
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
            btn.setAttribute('aria-label', t('ariaSwitchToDarkTheme'));
        }
    }

    /**
     * Rotates the current theme icon out, swaps it (via updateThemeIcon), then
     * rotates the new one in with an overshoot — used only on user-initiated
     * toggles. The swap deliberately waits for the "out" transition to finish
     * (setTimeout at OUT_MS) rather than firing in parallel with it — starting
     * both at once reads as a generic cross-fade, not a coin-flip morph.
     * @param {HTMLElement|null} btn - Theme toggle button.
     * @param {string} mode - Either 'dark' or 'light'.
     */
    function animateThemeIcon(btn, mode) {
        if (!btn) return;

        const oldSvg = btn.querySelector('svg');

        if (!oldSvg) {
            updateThemeIcon(btn, mode);
            return;
        }

        const OUT_MS = 180;
        const IN_ROTATE_MS = 420;
        const IN_FADE_MS = 220;

        oldSvg.style.transition = `transform ${OUT_MS}ms ease, opacity ${OUT_MS}ms ease`;
        oldSvg.style.transform = 'rotate(180deg) scale(0.6)';
        oldSvg.style.opacity = '0';

        setTimeout(() => {
            updateThemeIcon(btn, mode);

            const newSvg = btn.querySelector('svg');
            if (!newSvg) return;

            newSvg.style.transition = 'none';
            newSvg.style.transform = 'rotate(-180deg) scale(0.6)';
            newSvg.style.opacity = '0';

            requestAnimationFrame(() => {
                newSvg.style.transition = `transform ${IN_ROTATE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${IN_FADE_MS}ms ease`;
                newSvg.style.transform = 'rotate(0deg) scale(1)';
                newSvg.style.opacity = '1';
            });

            setTimeout(() => {
                newSvg.style.transition = '';
                newSvg.style.transform = '';
                newSvg.style.opacity = '';
            }, IN_ROTATE_MS + 20);
        }, OUT_MS);
    }
})();

/**
 * Syncs the theme-color meta tag so the mobile status bar
 * matches the current app theme on initial load and manual toggle.
 * @param {string} mode - Either 'dark' or 'light'.
 */
function updateThemeColorMeta(mode) {
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#18160f' : '#f5f2ec');
}

// =============================================================================
// THEME STYLE
// Settings picker for the 5 visual theme styles (TASK-119). Unlike the
// light/dark toggle, switching a style is a pure CSS variable swap with no
// text reflow, so it applies instantly with no loading-overlay flash and no
// page reload. Persists to localStorage always, and to the account when
// signed in — mirrors updateThemeStyle()/syncPreferredTheme() in auth.js.
// =============================================================================
(function () {
    const grid = document.getElementById('theme-style-grid');
    if (!grid) return;

    grid.innerHTML = THEME_STYLE_KEYS.map(key => {
        const preview = THEME_STYLE_PREVIEWS[key];
        const hintKey = THEME_REWARD_ACHIEVEMENT[key] ? achievementTitleKey(THEME_REWARD_ACHIEVEMENT[key]) : '';
        return `
            <button type="button" class="theme-style-card" data-theme-style-option="${key}">
                <span class="theme-style-swatch">
                    <span class="swatch-primary" style="background:${preview.light.bg}"></span>
                    <span class="swatch-accent" style="background:${preview.light.primary}"></span>
                    <span class="theme-style-lock" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </span>
                </span>
                <span class="theme-style-card-label" data-i18n="${themeStyleLabelKey(key)}"></span>
                ${hintKey ? `<span class="theme-style-card-hint" data-i18n="${hintKey}"></span>` : ''}
            </button>
        `;
    }).join('');

    applyI18n();
    updateThemeStyleGrid();

    grid.querySelectorAll('[data-theme-style-option]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const style = btn.dataset.themeStyleOption;
            const previous = document.documentElement.getAttribute('data-theme-style');
            if (style === previous) return;

            // Locked cards get pointer-events:none in CSS so this shouldn't fire in
            // practice — kept as a defensive no-op in case of a stale re-render.
            if (isThemeStyleLocked(style)) return;

            document.documentElement.setAttribute('data-theme-style', style);
            updateThemeStyleGrid();

            try {
                localStorage.setItem('themeStyle', style);
            } catch (e) {
            }

            if (!isGuest) {
                try {
                    const res = await Api.updateThemeStyle(style);
                    if (!res.ok) {
                        document.documentElement.setAttribute('data-theme-style', previous);
                        try {
                            localStorage.setItem('themeStyle', previous);
                        } catch (err) {
                        }
                        updateThemeStyleGrid();
                        toast(t('achievementsThemeErrorToast'));
                        return;
                    }
                    if (currentUser) currentUser.themeStyle = style;
                    checkForNewAchievements();
                } catch (e) {
                }
            }
        });
    });
})();

/**
 * Whether the given theme style is locked for the current user — always
 * false for "classic". Pessimistic before achievements have loaded: every
 * other style renders locked (and un-clickable, see .theme-style-card--locked
 * pointer-events:none) until refreshAchievementsUi() resolves, so there's no
 * window on first paint where an unearned theme is clickable.
 * @param {string} key
 * @returns {boolean}
 */
function isThemeStyleLocked(key) {
    if (key === 'classic') return false;
    if (!achievementStatuses) return true;

    const match = achievementStatuses.find(a => a.rewardType === 'theme' && a.rewardKey === key);
    return match ? !match.unlocked : true;
}

/**
 * Marks the theme-style card matching the currently active data-theme-style
 * attribute as active, and toggles the lock overlay per isThemeStyleLocked().
 * Called after the initial grid render, on every style switch, and again
 * once refreshAchievementsUi() (auth.js) resolves.
 */
function updateThemeStyleGrid() {
    const active = document.documentElement.getAttribute('data-theme-style');
    document.querySelectorAll('#theme-style-grid [data-theme-style-option]').forEach(btn => {
        const key = btn.dataset.themeStyleOption;
        btn.classList.toggle('is-active', key === active);
        btn.classList.toggle('theme-style-card--locked', isThemeStyleLocked(key));
    });
}

// =============================================================================
// LOGO
// One-time stroke "draw-in" on the header quote-mark icon, plus a 3D flip
// whenever the logo is clicked to go home.
// =============================================================================
/**
 * Plays the logo icon's one-time stroke "draw-in". Called from
 * hideLoadingOverlay() (auth.js) rather than at script load — #app-loading-overlay
 * fully covers the header until then, so playing it any earlier would just
 * run out unseen behind an opaque overlay.
 */
function drawLogoIcon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const paths = document.querySelectorAll('#logo-icon path');
    if (!paths.length) return;

    // getTotalLength() reads the real, exact length of each curved path — a hand-measured
    // guess (like the one that first shipped for the favourite star, see quotes.js history)
    // isn't reliable for anything more complex than straight polygon segments.
    const lengths = [...paths].map(path => path.getTotalLength());

    paths.forEach((path, i) => {
        path.style.strokeDasharray = String(lengths[i]);
        path.style.strokeDashoffset = String(lengths[i]);
    });

    requestAnimationFrame(() => {
        paths.forEach((path, i) => {
            path.style.transition = `stroke-dashoffset 600ms ease ${i * 100}ms`;
            path.style.strokeDashoffset = '0';
        });
    });

    setTimeout(() => {
        paths.forEach(path => {
            path.style.transition = '';
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
        });
    }, 600 + paths.length * 100 + 20);
}

/**
 * Rotates the header logo icon a further 180° around the Y axis — a "turning
 * the page" flourish on every click through to the QoD view, independent of
 * switchView() itself (purely decorative, doesn't gate navigation).
 */
function flipLogoIcon() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const icon = document.getElementById('logo-icon');
    if (!icon) return;

    const deg = (parseFloat(icon.dataset.flipDeg) || 0) + 180;
    icon.dataset.flipDeg = String(deg);
    icon.style.transform = `rotateY(${deg}deg)`;
}

// =============================================================================
// LANGUAGE
// Two toggle controls, shown in different states:
// - [data-lang-toggle] in the header — guests only (hidden once signed in,
//   see showGuestMode()/hideGuestMode() in auth.js). No network call, since
//   guests only ever see the QoD view. Briefly shows the same full-screen
//   loading overlay used at startup (#app-loading-overlay) before applying
//   the switch — otherwise the reflow (English text is more compact than
//   Russian) reads as a jarring flicker rather than a deliberate change.
// - [data-lang-toggle-settings] in Settings — signed-in users only. A
//   segmented RU/EN control (same pattern as the JSON/Yandex import source
//   toggle). Persists the choice to the account and reloads, since a
//   signed-in session has a lot more rendered state (quote list, modals,
//   tags) that only gets localized at render time — see setLanguage() in
//   i18n.js.
// =============================================================================
(function () {
    const headerBtn = document.querySelector('[data-lang-toggle]');
    if (!headerBtn) return;

    const SWITCH_DELAY_MS = 700;

    headerBtn.addEventListener('click', () => {
        if (headerBtn.disabled) return;

        const newLang = currentLanguage === 'ru' ? 'en' : 'ru';
        headerBtn.disabled = true;

        const overlay = document.getElementById('app-loading-overlay');
        overlay?.classList.remove('hidden');

        setTimeout(() => {
            setLanguage(newLang);
            if (isGuest) quotes = getGuestQuotes();
            renderQod(currentQodIndex);
            headerBtn.disabled = false;
            overlay?.classList.add('hidden');
        }, SWITCH_DELAY_MS);
    });
})();

(function () {
    const settingsToggle = document.querySelector('[data-lang-toggle-settings]');
    if (!settingsToggle) return;

    settingsToggle.querySelectorAll('[data-lang-option]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const newLang = btn.dataset.langOption;
            if (newLang === currentLanguage) return;

            try {
                localStorage.setItem('epigraph_lang', newLang);
            } catch (e) {
            }

            try {
                await Api.updatePreferredLanguage(newLang);
            } catch (e) {
            }

            location.reload();
        });
    });
})();

updateLangToggleLabel();

/**
 * Updates the header toggle's label to the language a click would switch to
 * (e.g. shows "EN" while the app is in Russian), and marks the matching
 * option active in the Settings segmented toggle.
 */
function updateLangToggleLabel() {
    const headerBtn = document.querySelector('[data-lang-toggle]');
    if (headerBtn) {
        headerBtn.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
    }

    document.querySelectorAll('[data-lang-toggle-settings] [data-lang-option]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.langOption === currentLanguage);
    });
    moveToggleIndicator(document.querySelector('[data-lang-toggle-settings]'));
}

// =============================================================================
// NAVIGATION
// Logic for switching between the main application views.
// =============================================================================
/**
 * Slides the shared nav-tab-indicator pill under whichever `.nav-tab` currently
 * has the `active` class. If no tab is active — the QoD tab loses `active` while
 * browsing away from today's actual quote via Random/swipe, see renderQod() in
 * quotes.js — the pill fades out in place instead of collapsing, so it reads as
 * the highlight quietly letting go rather than shrinking away.
 * The first call positions it instantly (no transition yet) and then marks
 * `.nav-tabs` ready, so later calls animate smoothly instead of sliding in from
 * the left edge on initial page load.
 */
function moveNavIndicator() {
    const nav = document.querySelector('.nav-tabs');
    const indicator = document.getElementById('nav-tab-indicator');
    if (!nav || !indicator) return;

    const active = document.querySelector('.nav-tab.active');

    if (!active) {
        indicator.style.opacity = '0';
        nav.classList.add('indicator-ready');
        return;
    }

    indicator.style.left = active.offsetLeft + 'px';
    indicator.style.width = active.offsetWidth + 'px';
    indicator.style.opacity = '1';
    nav.classList.add('indicator-ready');
}

window.addEventListener('resize', moveNavIndicator);

// The very first measurement can run before Inter finishes loading (the <link> uses
// display=swap), so it's briefly taken against the fallback system font's metrics —
// once the real font swaps in, short labels like "Today" can end up a visibly
// different width than what the pill was sized for. Re-measure once fonts actually
// settle to correct that drift (matches the document.fonts.ready pattern already used
// for QoD card sizing in qod.js).
document.fonts.ready.then(moveNavIndicator);

/**
 * Slides a single `.import-source-indicator` pill under whichever `.import-source-tab`
 * inside `container` currently has `is-active` — same measure-and-transform approach as
 * moveNavIndicator(), reused here because this segmented-toggle look now appears in
 * several places (import source, language, notification on/off, notification frequency).
 * `container` may be hidden (e.g. its view isn't the active one yet), in which case
 * offsetLeft/offsetWidth read as 0 — callers re-invoke this once the view becomes visible.
 */
function moveToggleIndicator(container) {
    if (!container) return;
    const indicator = container.querySelector('.import-source-indicator');
    const active = container.querySelector('.import-source-tab.is-active');
    if (!indicator || !active) return;

    // Bail while the container isn't laid out yet (its view/modal is still hidden) — offsetWidth
    // reads 0. Positioning to 0 here, and especially adding `indicator-ready` (which switches on
    // the CSS slide transition), would make the *next* call — the one that runs once the view is
    // finally visible with real metrics — animate the pill in from the left edge every time the
    // screen is opened. That's the "slider button jumps on screen change". Skipping entirely lets
    // the first call that runs while the container is actually visible position the pill instantly
    // (indicator-ready still absent → no transition), so only genuine tab switches animate.
    if (!active.offsetWidth) return;

    indicator.style.left = active.offsetLeft + 'px';
    indicator.style.width = active.offsetWidth + 'px';
    container.classList.add('indicator-ready');
}

/** Re-syncs every segmented-toggle indicator on the page — see moveToggleIndicator(). */
function moveAllToggleIndicators() {
    document.querySelectorAll('.import-source-toggle').forEach(moveToggleIndicator);
}

window.addEventListener('resize', moveAllToggleIndicators);
document.fonts.ready.then(moveAllToggleIndicators);

/**
 * Switches the currently active view and tab, and triggers per-view rendering.
 * For guests block everything except qod
 * @param {string} id - View identifier ('qod', 'list', 'add', 'settings').
 */
function switchView(id) {
    if (isGuest && id !== 'qod') {
        toast(t('toastLoginRequired'));
        return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + id).classList.add('active');
    document.getElementById('tab-' + id).classList.add('active');
    moveNavIndicator();

    if (id !== 'qod') document.body.classList.remove('no-scroll');
    if (id === 'list') {
        renderList();

        // A pending share-page redirect means the target card must not be hidden
        // behind pagination. renderList()'s own resetPage=true branch always resets
        // listVisibleCount back to LIST_PAGE_SIZE, so setting it beforehand doesn't
        // stick — instead, reuse the same incremental-append path loadMoreQuotes()
        // uses (renderList(false)) to reveal the rest without re-rendering (and
        // thus re-animating) the cards already on screen.
        if (hasPendingSharedImport()) {
            listVisibleCount = quotes.length;
            renderList(false);
            highlightPendingSharedImport();
        }
    }
    // loadQod() talks to the authenticated /api/quotes/qod endpoint, which 204s for
    // guests (no account to resolve a QoD for) — that would reset qodAnchorId to null
    // and incorrectly clear the "Today" highlight even though the same guest anchor
    // quote is still on screen. Guests already have their anchor (quotes[0], set in
    // showGuestMode()), so just re-render it instead of hitting the backend.
    if (id === 'qod') {
        // Only animate the content swap when the card is about to show something other than
        // today's actual quote — landing back on a QoD that was already on screen (e.g.
        // clicking "Today" again, or returning from another tab without having browsed away
        // via Random/swipe) shouldn't replay the transition. currentQodIndex === -1 means the
        // card has never been rendered at all (very first "Today" visit this session) — nothing
        // real to crossfade from yet, so treat that as "already showing" too, otherwise the
        // very first render plays phase 1 (fade/collapse) against an empty placeholder card
        // before any data has loaded, flashing an empty card for a moment.
        const alreadyShowingQod = currentQodIndex === -1 || quotes[currentQodIndex]?.id === qodAnchorId;
        if (isGuest) {
            if (alreadyShowingQod) renderQod(); else renderQodAnimated();
        } else {
            loadQod(!alreadyShowingQod);
        }
    }
    if (id === 'add') { renderTags(); moveAllToggleIndicators(); }
    if (id === 'settings') {
        updateSettingsAccount();
        loadAppVersion();
        moveAllToggleIndicators();
    }

    // Update URL hash to reflect the current section (enables back button and bookmarking)
    const hashMap = { qod: '#today', list: '#all', add: '#add', settings: '#settings' };
    const newHash = hashMap[id] || '#today';
    if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
    }

    updateScrollTopBtn();
}

// =============================================================================
// SCROLL TO TOP
// Floating button, "Мои цитаты" list view only — the page scrolls on the
// document itself (no inner scrollable container), so this listens on window.
// =============================================================================
const SCROLL_TOP_THRESHOLD_PX = 480;

/**
 * Shows/hides the floating scroll-to-top button based on the current view and
 * scroll position. Called on every scroll event and on every switchView().
 */
function updateScrollTopBtn() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;

    const onListView = document.getElementById('view-list')?.classList.contains('active');
    btn.classList.toggle('visible', !!onListView && window.scrollY > SCROLL_TOP_THRESHOLD_PX);
}

/** Smooth-scrolls back to the top of the page — called by the floating button's onclick. */
function scrollListToTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.addEventListener('scroll', updateScrollTopBtn, {passive: true});

/**
 * Navigates to the Add view and scrolls to the import section.
 */
function goToImport() {
    switchView('add');
    setTimeout(() => {
        const importArea = document.querySelector('.import-area');
        if (importArea) importArea.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, 100);
}

// =============================================================================
// MODAL
// Modal dialog show/close helpers and overlay-click handling.
// =============================================================================
/**
 * Shows the shared modal dialog with the given title, body, and action buttons.
 * @param {string} title - Modal heading text. Pass '' to hide the heading entirely.
 * @param {string} body - HTML string rendered inside the modal body.
 * @param {Array<{label: string, cls: string, action: Function}>} actions - Buttons to render in the footer.
 * @param {boolean} [wide] - Use a wider dialog (e.g. for icon-grid pickers). Resets on every call.
 * @param {boolean} [centered] - Center the footer action buttons instead of the default
 *   right-alignment (e.g. for celebratory/single-focus modals). Resets on every call.
 */
function showModal(title, body, actions, wide, centered) {
    const titleEl = document.getElementById('modal-title');
    titleEl.textContent = title;
    titleEl.style.display = title ? '' : 'none';
    document.getElementById('modal-body').innerHTML = body;
    const actEl = document.getElementById('modal-actions');
    actEl.innerHTML = '';

    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.className = a.cls;
        if (a.id) btn.id = a.id;
        btn.textContent = a.label;
        // Bind the action directly so closeModal() runs without a MouseEvent argument, bypassing the overlay-click guard
        btn.addEventListener('click', a.action);
        actEl.appendChild(btn);
    });

    const modalEl = document.querySelector('#modal .modal');
    modalEl.classList.toggle('modal--wide', !!wide);
    modalEl.classList.toggle('modal--centered', !!centered);
    document.getElementById('modal').classList.add('open');
    lockBackgroundScroll();
}

/**
 * Locks background scroll while a modal is open WITHOUT losing the scroll position — pins the
 * body with position:fixed offset by the current scrollY, so the page stays visually in place
 * under the blur instead of jumping to the top. Guarded so a modal that re-renders in place
 * (e.g. import preview → summary calls showModal() again while already open) doesn't re-capture
 * a now-zero scrollY and lose the original position.
 */
function lockBackgroundScroll() {
    if (document.body.classList.contains('modal-lock-scroll')) return;
    document.body.style.top = `-${window.scrollY}px`;
    document.body.classList.add('modal-lock-scroll');
}

/**
 * Releases the scroll lock and restores the exact scroll position captured on lock.
 */
function unlockBackgroundScroll() {
    if (!document.body.classList.contains('modal-lock-scroll')) return;
    const scrollY = -parseInt(document.body.style.top || '0', 10);
    document.body.classList.remove('modal-lock-scroll');
    document.body.style.top = '';
    // behavior:'instant' is REQUIRED here. Removing position:fixed drops the page to real scrollY 0
    // (the top), then this call restores the saved position. A bare scrollTo(0, scrollY) inherits
    // the global `html { scroll-behavior: smooth }`, so it would *animate* from top back down —
    // the visible "jump to top then slide down" on close. Instant makes the restore imperceptible.
    window.scrollTo({top: scrollY, left: 0, behavior: 'instant'});
}

/** Set while a long-running operation (e.g. bulk import) owns the open modal, to block Escape/overlay-click from closing it underneath that operation. */
let modalBusy = false;

/**
 * Closes the shared modal dialog. No-ops while modalBusy is set.
 */
function closeModal() {
    if (modalBusy) return;
    document.getElementById('modal').classList.remove('open');
    unlockBackgroundScroll();
}

/**
 * Closes the modal when the user clicks on the overlay background (but not on the dialog itself).
 * @param {MouseEvent} e - The click event on the overlay.
 */
function handleModalOverlayClick(e) {
    if (e.target === document.getElementById('modal')) closeModal();
}

// Close the modal when the user presses Escape
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    // close basic modal
    if (document.getElementById('modal').classList.contains('open')) {
        closeModal();
    }

    // close login modal
    if (document.getElementById('auth-screen').classList.contains('visible')) {
        hideAuthModal();
    }

    closeSortMenu();
});

// =============================================================================
// TOAST
// Transient notification helper.
// =============================================================================
/**
 * Displays a transient toast notification at the bottom-right of the screen.
 * @param {string} msg - Message to display.
 * @param {'success'|'error'} [type='success'] - Visual style variant.
 */
function toast(msg, type) {
    const wrap = document.getElementById('toast-wrap');
    // Only ever show the latest toast — piling up several at once (e.g. from repeated
    // "Copy" clicks) hasn't been useful anywhere in the app.
    wrap.querySelectorAll('.toast').forEach(el => el.remove());

    const el = document.createElement('div');

    el.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), TOAST_FADE_DURATION_MS);
    }, TOAST_DISPLAY_DURATION_MS);
}

// =============================================================================
// UTILITIES
// Small shared helpers used across multiple sections.
// =============================================================================
/**
 * Formats a quote object into a plain-text string suitable for copying.
 * Format: "text\n— author, «source»"
 * @param {Object} quote - Quote object with text, author, source fields.
 * @returns {string} Formatted plain-text representation.
 */
function formatQuoteAsText(quote) {
    let result = quote.text;

    if (quote.author) result += '\n— ' + quote.author;
    if (quote.source) result += '\n«' + quote.source + '»';

    return result;
}

/**
 * Escapes a string for safe inclusion in HTML.
 * @param {*} s - Value to escape (coerced to string).
 * @returns {string} Escaped HTML-safe string.
 */
function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Character counter for quote textarea fields
const QUOTE_MAX_LENGTH = 1000;
const QUOTE_WARN_THRESHOLD = 900; // 90% of limit

function updateCharCounter(textarea, counterId, submitBtnId) {
    const counter = document.getElementById(counterId);
    const submitBtn = submitBtnId ? document.getElementById(submitBtnId) : null;
    if (!counter) return;

    const len = textarea.value.length;
    counter.textContent = `${len} / ${QUOTE_MAX_LENGTH}`;

    counter.classList.remove('is-warning', 'is-over');

    if (len > QUOTE_MAX_LENGTH) {
        counter.classList.add('is-over');
        if (submitBtn) submitBtn.disabled = true;
    }
    else if (len === QUOTE_MAX_LENGTH) {
        counter.classList.add('is-over');
    }
    else if (len >= QUOTE_WARN_THRESHOLD) {
        counter.classList.add('is-warning');
        if (submitBtn) submitBtn.disabled = false;
    }
    else {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Updates a character counter for a plain text input (no submit button blocking).
 * @param {HTMLInputElement} input
 * @param {string} counterId
 * @param {number} max
 */
function updateInputCounter(input, counterId, max) {
    const len = input.value.length;
    const counter = document.getElementById(counterId);

    if (!counter) return;

    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('is-warning', len >= max * 0.85);
    counter.classList.toggle('is-over', len >= max);
}

// Init tag area (runs once DOM is ready; view-add may be hidden but wrap exists)
renderTags();

// Add form — attach counter
const quoteTextArea = document.getElementById('q-text');
if (quoteTextArea) {
    quoteTextArea.addEventListener('input', () => {
        updateCharCounter(quoteTextArea, 'quoteTextCounter', 'addQuoteSubmitBtn');
    });
}

const authorInput = document.getElementById('q-author');
if (authorInput) {
    updateInputCounter(authorInput, 'authorCounter', 100);
    authorInput.addEventListener('input', () => updateInputCounter(authorInput, 'authorCounter', 100));
}

const sourceInput = document.getElementById('q-source');
if (sourceInput) {
    updateInputCounter(sourceInput, 'sourceCounter', 200);
    sourceInput.addEventListener('input', () => updateInputCounter(sourceInput, 'sourceCounter', 200));
}

// =============================================================================
// ANNOUNCEMENT BANNER
// The dismissible announcement bar at the top of the app. Moved here from auth.js (TASK-127).
// =============================================================================
async function loadBanner() {
    try {
        const res = await fetch('/api/banner');
        if (!res.ok) return;
        const data = await res.json();
        const msg = data.message?.trim();
        if (!msg) return;

        // Don't show again if dismissed in this session
        const dismissed = sessionStorage.getItem('banner-dismissed');
        if (dismissed === msg) return;

        const banner = document.getElementById('announcement-banner');
        const text   = document.getElementById('announcement-banner-text');
        if (!banner || !text) return;

        text.textContent = msg;
        banner.style.display = 'flex';
    } catch (e) {}
}

function dismissBanner() {
    const banner = document.getElementById('announcement-banner');
    const text   = document.getElementById('announcement-banner-text');
    if (!banner) return;

    // Remember this specific message was dismissed
    if (text?.textContent) {
        sessionStorage.setItem('banner-dismissed', text.textContent);
    }

    banner.style.transition = 'opacity 200ms ease, transform 200ms ease';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-6px)';
    setTimeout(() => banner.style.display = 'none', 210);
}
