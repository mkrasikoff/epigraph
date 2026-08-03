/**
 * guest-landing.js — Guest-only landing behaviour for Epigraph (TASK-135).
 *
 * The unauthenticated landing reuses the QoD card as a live, self-playing demo that
 * quietly cross-fades through a short curated loop of quotes. This file owns everything
 * specific to that guest view — it is no longer the QoD screen — so qod.js stays focused
 * on the authenticated Quote-of-the-Day experience.
 *
 * Depends on globals:
 * - isGuest      {boolean} — defined in auth.js
 * - quotes       {Array}   — defined in state.js
 * - renderQod()  {fn}      — defined in qod.js
 *
 * Provides (globals):
 * - applyGuestQodSize(text)   {fn} — called from qod.js applyQodAdaptiveSize for guests
 * - renderGuestQodTags(quote) {fn} — called from qod.js renderQod for guests
 * - startGuestQodCycle()      {fn} — called from auth.js showGuestMode
 * - stopGuestQodCycle()       {fn} — called from auth.js hideGuestMode (sign-in)
 * - guestRandomQuote()        {fn} — called from qod.js randomQuote() when a guest clicks Random
 */

// =============================================================================
// FIXED-SIZE DEMO CARD
// On the guest landing the card has a fixed footprint (min-height + capped width,
// set in CSS); only the FONT scales to the quote length. This keeps the card from
// resizing as quotes cycle, so the rest of the page never jumps up/down — unlike the
// authenticated QoD hero, which deliberately resizes the whole card per quote.
// =============================================================================
function applyGuestQodSize(text) {
    const el = document.getElementById('qod-text');
    if (!el) return;
    const len = (text || '').length;
    let rem;
    if (len <= 45) rem = 1.9;
    else if (len <= 75) rem = 1.6;
    else if (len <= 115) rem = 1.35;
    else if (len <= 170) rem = 1.15;
    else rem = 0.95;
    el.style.fontSize = rem + 'rem';
}

// Render a quote's tags as chips under the author on the guest demo card. Quotes with
// no tags (e.g. random ones from the full pool) simply clear the row.
function renderGuestQodTags(quote) {
    const box = document.getElementById('qod-guest-tags');
    if (!box) return;
    box.innerHTML = '';
    const tags = (quote && quote.tags) || [];
    tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'qod-tag';
        chip.textContent = tag;
        box.appendChild(chip);
    });
}

// =============================================================================
// AUTO-CYCLING DEMO
// The guest QoD card quietly cross-fades through a short curated loop of quotes —
// a live "self-playing" demo of the app. Not the full guest set (that would need as
// many dots as quotes); a small loop keeps the indicator legible. The whole set is
// still reachable via the "Random" button, which stops the auto-cycle.
// =============================================================================
const GUEST_DEMO_COUNT = 5;
const GUEST_DEMO_INTERVAL = 3600;
const GUEST_DEMO_FADE = 450;
const GUEST_DEMO_IDLE_RESUME = 5000; // resume auto-cycling this long after a manual "Random"
let guestQodTimer = null;
let guestIdleTimer = null;
let guestDemoPos = 0;
let guestDemoEnabled = false; // true between start and a stop/sign-in
let guestManualPaused = false; // true after a manual "Random", until the idle timer resumes

function guestDemoLoopSize() {
    return Math.min(GUEST_DEMO_COUNT, quotes.length);
}

function buildGuestQodDots() {
    const box = document.getElementById('qod-guest-dots');
    if (!box) return;
    box.innerHTML = '';
    for (let i = 0; i < guestDemoLoopSize(); i++) {
        const dot = document.createElement('span');
        dot.className = 'qod-dot' + (i === guestDemoPos ? ' active' : '');
        box.appendChild(dot);
    }
}

function updateGuestQodDots() {
    const box = document.getElementById('qod-guest-dots');
    if (!box) return;
    Array.prototype.forEach.call(box.children, (el, i) => {
        el.classList.toggle('active', i === guestDemoPos);
    });
}

// All dots dim — the visitor is off the curated loop (a manual "Random" quote is shown).
function deactivateGuestQodDots() {
    const box = document.getElementById('qod-guest-dots');
    if (!box) return;
    Array.prototype.forEach.call(box.children, el => el.classList.remove('active'));
}

// Start the auto-cycling demo from scratch (called once when guest mode is shown).
function startGuestQodCycle() {
    if (!isGuest || !quotes.length) return;
    // Respect reduced-motion: leave a single static quote, no dots, no timer.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    guestDemoEnabled = true;
    guestManualPaused = false;
    buildGuestQodDots();
    runGuestQodTimer();

    // Pause while the visitor is reading or interacting; resume when the pointer leaves.
    const section = document.querySelector('.qod-section');
    if (section && !section.dataset.cycleHooked) {
        section.dataset.cycleHooked = '1';
        section.addEventListener('mouseenter', pauseGuestQodCycle);
        section.addEventListener('mouseleave', resumeGuestQodCycle);
        section.addEventListener('focusin', pauseGuestQodCycle);
    }
}

// One cross-fade step to the next quote in the curated loop.
function stepGuestQod() {
    const card = document.querySelector('.qod-card');
    if (!card) return;
    card.style.opacity = '0';
    setTimeout(() => {
        guestDemoPos = (guestDemoPos + 1) % guestDemoLoopSize();
        renderQod(guestDemoPos);
        card.style.opacity = '1';
        updateGuestQodDots();
    }, GUEST_DEMO_FADE);
}

function runGuestQodTimer() {
    clearInterval(guestQodTimer);
    guestQodTimer = setInterval(stepGuestQod, GUEST_DEMO_INTERVAL);
}

// Pause = clear the timer but keep the demo enabled, so a later mouseleave resumes it.
function pauseGuestQodCycle() {
    clearInterval(guestQodTimer);
    guestQodTimer = null;
}

function resumeGuestQodCycle() {
    // While manually paused, only the idle timer may resume — not a stray mouseleave.
    if (guestManualPaused) return;
    if (guestDemoEnabled && isGuest && !guestQodTimer) runGuestQodTimer();
}

// Guest clicked "Random": step off the curated loop. Dim every dot to signal manual
// browsing, then auto-cycling resumes once they've left it alone for a few seconds.
function onGuestManualQuote() {
    if (!isGuest) return;
    guestDemoEnabled = true;
    guestManualPaused = true;
    pauseGuestQodCycle();
    deactivateGuestQodDots();
    clearTimeout(guestIdleTimer);
    guestIdleTimer = setTimeout(() => {
        if (!isGuest) return;
        guestManualPaused = false;
        stepGuestQod();      // jump back onto the loop with a fade
        runGuestQodTimer();
    }, GUEST_DEMO_IDLE_RESUME);
}

// A guest clicked "Random": a plain opacity cross-fade to a random quote from the full
// pool (no QoD collapse/expand animation, so the fixed-size card doesn't jump), plus the
// dim-dots + idle-resume handling above.
function guestRandomQuote() {
    onGuestManualQuote();

    let idx;
    do {
        idx = Math.floor(Math.random() * quotes.length);
    } while (idx === currentQodIndex && quotes.length > 1);

    const card = document.querySelector('.qod-card');
    if (!card) {
        renderQod(idx);
        return;
    }
    card.style.opacity = '0';
    setTimeout(() => {
        renderQod(idx);
        card.style.opacity = '1';
    }, GUEST_DEMO_FADE);
}

// Stop = end the demo for good (signed in).
function stopGuestQodCycle() {
    guestDemoEnabled = false;
    guestManualPaused = false;
    clearTimeout(guestIdleTimer);
    pauseGuestQodCycle();
}

// Keep the guest footer's copyright year current (HTML carries a static fallback so
// no-JS crawlers still see a year). Runs once at load — this script tag sits at the
// end of <body>, so the element is already parsed.
(function () {
    const yearEl = document.getElementById('guest-footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
