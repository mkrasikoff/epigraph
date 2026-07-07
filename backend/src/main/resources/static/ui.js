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

    htmlElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(themeToggleBtn, currentTheme);
    updateThemeColorMeta(currentTheme);

    themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', currentTheme);
        try {
            localStorage.setItem('theme', currentTheme);
        } catch (e) {
        }
        updateThemeIcon(themeToggleBtn, currentTheme);
        updateThemeColorMeta(currentTheme);
    });

    /**
     * Updates the theme toggle button icon and aria-label for the current theme.
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
}

// =============================================================================
// NAVIGATION
// Logic for switching between the main application views.
// =============================================================================
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

    if (id !== 'qod') document.body.classList.remove('no-scroll');
    if (id === 'list') renderList();
    if (id === 'qod') loadQod();
    if (id === 'add') renderTags();
    if (id === 'settings') {
        updateSettingsAccount();
        loadAppVersion();
    }

    // Update URL hash to reflect the current section (enables back button and bookmarking)
    const hashMap = { qod: '#today', list: '#all', add: '#add', settings: '#settings' };
    const newHash = hashMap[id] || '#today';
    if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
    }
}

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
 */
function showModal(title, body, actions, wide) {
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

    document.querySelector('#modal .modal').classList.toggle('modal--wide', !!wide);
    document.getElementById('modal').classList.add('open');
    document.body.classList.add('modal-lock-scroll');
}

/** Set while a long-running operation (e.g. bulk import) owns the open modal, to block Escape/overlay-click from closing it underneath that operation. */
let modalBusy = false;

/**
 * Closes the shared modal dialog. No-ops while modalBusy is set.
 */
function closeModal() {
    if (modalBusy) return;
    document.getElementById('modal').classList.remove('open');
    document.body.classList.remove('modal-lock-scroll');
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
