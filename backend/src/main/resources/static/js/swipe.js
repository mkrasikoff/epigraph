/**
 * swipe.js — Reigns-style swipe gesture for the Quote-of-the-Day card in Epigraph.
 *
 * Self-invoking IIFE that wires Pointer Events on the `.qod-card` element to provide
 * drag-with-tilt, fly-out animation, and snap-back behavior. On a completed swipe it
 * advances to a random quote via renderQod().
 *
 * Must be loaded after state.js (reads/writes module state) and after qod.js
 * (uses renderQod). Loaded before bootstrap.js per the script ordering.
 *
 * Depends on:
 * - isGuest          {boolean}  — defined in auth.js
 * - quotes           {Array}    — defined in state.js
 * - currentQodIndex  {number}   — defined in state.js
 * - renderQod()      {fn}       — defined in qod.js
 */

// Swipe on QOD card — Reigns-style drag with tilt and fly-out animation
(function () {
    const card = document.querySelector('.qod-card');
    const overlayL = document.getElementById('swipe-left');
    const overlayR = document.getElementById('swipe-right');
    if (!card) return;

    function isSwipeAllowed() {
        // Guests always have preset quotes — allow swipe
        // Logged-in users with empty library — block
        return isGuest || quotes.length > 0;
    }

    const THRESHOLD = 110; // px — minimum drag distance to trigger swipe
    const MAX_DRAG = 160; // px — maximum visual displacement

    let dragging = false;
    let startX = 0, startY = 0, currentX = 0;
    let pointerLocked = false;
    let isAnimating = false;

    function applyDrag(dx) {
        const clamped = Math.sign(dx) * Math.min(Math.abs(dx), MAX_DRAG);
        const rotate = clamped * 0.045;
        card.style.transform = `translateX(${clamped}px) rotate(${rotate}deg)`;
        const ratio = Math.min(1, Math.abs(dx) / THRESHOLD);
        if (dx < 0) {
            overlayL.style.opacity = ratio;
            overlayR.style.opacity = 0;
        } else {
            overlayR.style.opacity = ratio;
            overlayL.style.opacity = 0;
        }
    }

    function snapBack() {
        card.classList.remove('is-dragging');
        card.style.transition = 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease-out';
        card.style.transform = '';
        overlayL.style.opacity = 0;
        overlayR.style.opacity = 0;
        setTimeout(() => {
            card.style.transition = '';
        }, 430);
    }

    function flyOut(direction) {
        isAnimating = true;
        card.classList.remove('is-dragging');

        // Freeze card height to prevent layout jump during animation
        card.style.height = card.offsetHeight + 'px';

        // Phase 1: fly out
        card.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease-in';
        const flyX = direction * (window.innerWidth * 0.85 + 200);
        const flyRot = direction * 20;
        card.style.transform = `translateX(${flyX}px) rotate(${flyRot}deg)`;
        card.style.opacity = '0';
        overlayL.style.opacity = 0;
        overlayR.style.opacity = 0;

        setTimeout(() => {
            // Phase 2: reposition — come in from opposite side, slightly below
            card.style.transition = 'none';
            card.style.transform = `translateX(${-direction * 60}px) translateY(20px)`;
            card.style.opacity = '0';

            // Compute next index without triggering card animation
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * quotes.length);
            } while (nextIdx === currentQodIndex && quotes.length > 1);

            // Release height freeze, update content, then measure new size
            const prevHeight = parseFloat(card.style.height);
            card.style.height = 'auto';

            renderQod(nextIdx);

            // Force reflow so browser computes dimensions after text + font + width class update
            void card.offsetHeight;

            const newHeight = card.offsetHeight;
            const heightChanged = Math.abs(newHeight - prevHeight) > 4;
            if (heightChanged) card.style.height = prevHeight + 'px';
            else card.style.height = '';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.style.transition = [
                        'transform 520ms cubic-bezier(0.16, 1, 0.3, 1)',
                        'opacity 380ms ease-out',
                        heightChanged ? 'height 460ms cubic-bezier(0.16, 1, 0.3, 1)' : ''
                    ].filter(Boolean).join(', ');
                    card.style.transform = '';
                    card.style.opacity = '1';
                    if (heightChanged) card.style.height = newHeight + 'px';

                    setTimeout(() => {
                        // Remove transition before clearing inline styles
                        // to prevent the CSS width transition from re-triggering
                        card.style.transition = 'none';
                        card.style.transform = '';
                        card.style.opacity = '';
                        card.style.height = '';
                        requestAnimationFrame(() => {
                            card.style.transition = '';
                            isAnimating = false;
                        });
                    }, 540);
                });
            });
        }, 310);
    }

    // Pointer Events API — works for both touch and mouse
    card.addEventListener('pointerdown', e => {
        if (isAnimating || !isSwipeAllowed()) return; // block swipe when no quotes
        if (e.button !== undefined && e.button !== 0) return;
        dragging = true;
        pointerLocked = false;
        startX = e.clientX;
        startY = e.clientY;
        currentX = 0;
        card.setPointerCapture(e.pointerId);
        card.classList.add('is-dragging');
        card.classList.remove('is-snapping');
    });

    card.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Block swipe if the movement is more vertical than horizontal
        if (!pointerLocked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
            dragging = false;
            snapBack();
            return;
        }
        if (Math.abs(dx) > 8) pointerLocked = true;
        if (pointerLocked) e.preventDefault();
        currentX = dx;
        applyDrag(dx);
    });

    card.addEventListener('pointerup', e => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('is-dragging');
        if (Math.abs(currentX) >= THRESHOLD) {
            flyOut(currentX > 0 ? 1 : -1);
        } else {
            snapBack();
        }
    });

    card.addEventListener('pointercancel', () => {
        if (!dragging) return;
        dragging = false;
        snapBack();
    });
})();
