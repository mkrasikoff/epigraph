/**
 * avatars.js — Preset avatar icon library for Epigraph.
 *
 * Defines the 12 selectable avatar icons (11 animals + the neutral default)
 * as inline SVG markup, keyed by the same string the backend stores in
 * User.avatarIcon and expects in PATCH /api/user/me/avatar.
 *
 * Depends on:
 * - (none) — pure data module, load before auth.js.
 *
 * Provides (globals):
 * - AVATAR_ICON_KEYS   {string[]} — display order for the icon picker
 * - AVATAR_ICONS       {Object}   — key -> inline SVG markup string
 * - avatarIconMarkup(key) {fn}    — returns markup for a key, falling back to 'neutral'
 * - avatarIconLabelKey(key) {fn}  — returns the i18n key for a display label (see i18n.js)
 */

const AVATAR_ICON_KEYS = [
    'neutral', 'bear', 'cat', 'dog', 'hamster', 'rabbit',
    'fox', 'owl', 'elephant', 'mouse', 'duck', 'seal'
];

const AVATAR_ICONS = {
    neutral: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',

    bear: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="6.3" cy="6.8" r="2.6" fill="#d4956a"/><circle cx="17.7" cy="6.8" r="2.6" fill="#d4956a"/><circle cx="6.3" cy="7.1" r="1.15" fill="#f0b888"/><circle cx="17.7" cy="7.1" r="1.15" fill="#f0b888"/><circle cx="12" cy="13.5" r="7.8" fill="#d4956a"/><ellipse cx="12" cy="15.8" rx="3" ry="2.3" fill="#f0b888"/><circle cx="9.1" cy="12.6" r="1" fill="#3a2d22"/><circle cx="14.9" cy="12.6" r="1" fill="#3a2d22"/><ellipse cx="12" cy="15" rx="0.85" ry="0.6" fill="#3a2d22"/></svg>',

    cat: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4.3 9 L7.5 3.3 L10.2 9 Z" fill="#c8956c"/><path d="M19.7 9 L16.5 3.3 L13.8 9 Z" fill="#c8956c"/><path d="M5.5 8.3 L7.5 4.8 L9 8.3 Z" fill="#f0b888"/><path d="M18.5 8.3 L16.5 4.8 L15 8.3 Z" fill="#f0b888"/><circle cx="12" cy="13.6" r="7.6" fill="#c8956c"/><circle cx="9.1" cy="12.3" r="1.05" fill="#3a2d22"/><circle cx="9.4" cy="11.9" r="0.32" fill="#e8e3d8"/><circle cx="14.9" cy="12.3" r="1.05" fill="#3a2d22"/><circle cx="15.2" cy="11.9" r="0.32" fill="#e8e3d8"/><path d="M11.2 14.9 L12 15.8 L12.8 14.9 Z" fill="#3a2d22"/><path d="M4.6 13.4 h2.6 M4.6 15 h2.2" stroke="#3a2d22" stroke-width="0.5" stroke-linecap="round"/><path d="M16.8 13.4 h2.6 M17.2 15 h2.2" stroke="#3a2d22" stroke-width="0.5" stroke-linecap="round"/></svg>',

    dog: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 5.5 C2.5 7 2 13 6.5 15.5 C7 12 6.5 8 6 5.5 Z" fill="#e8a87a"/><path d="M18 5.5 C21.5 7 22 13 17.5 15.5 C17 12 17.5 8 18 5.5 Z" fill="#e8a87a"/><circle cx="12" cy="13.5" r="7.8" fill="#e8a87a"/><ellipse cx="12" cy="16" rx="2.8" ry="2.1" fill="#f0b888"/><circle cx="9.1" cy="12.4" r="1" fill="#3a2d22"/><circle cx="14.9" cy="12.4" r="1" fill="#3a2d22"/><ellipse cx="12" cy="15.3" rx="1" ry="0.75" fill="#3a2d22"/></svg>',

    hamster: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="6.5" cy="7.3" r="1.9" fill="#f0b888"/><circle cx="17.5" cy="7.3" r="1.9" fill="#f0b888"/><ellipse cx="12" cy="13.8" rx="8.2" ry="7.3" fill="#f0b888"/><circle cx="9.6" cy="12.4" r="0.85" fill="#3a2d22"/><circle cx="14.4" cy="12.4" r="0.85" fill="#3a2d22"/><ellipse cx="12" cy="14.7" rx="0.55" ry="0.4" fill="#3a2d22"/></svg>',

    rabbit: '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="8" cy="4.2" rx="1.8" ry="4" fill="#d4956a"/><ellipse cx="16" cy="4.2" rx="1.8" ry="4" fill="#d4956a"/><ellipse cx="8" cy="4.6" rx="0.9" ry="3" fill="#f0b888"/><ellipse cx="16" cy="4.6" rx="0.9" ry="3" fill="#f0b888"/><circle cx="12" cy="13.8" r="7.6" fill="#d4956a"/><ellipse cx="12" cy="16" rx="2.6" ry="2" fill="#f0b888"/><circle cx="9.1" cy="12.6" r="1" fill="#3a2d22"/><circle cx="14.9" cy="12.6" r="1" fill="#3a2d22"/><ellipse cx="12" cy="14.9" rx="0.8" ry="0.55" fill="#3a2d22"/></svg>',

    fox: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3.6 9 L8 1.6 L10.6 9 Z" fill="#c8956c"/><path d="M20.4 9 L16 1.6 L13.4 9 Z" fill="#c8956c"/><path d="M5.2 8.2 L8 4 L9.4 8.2 Z" fill="#f0b888"/><path d="M18.8 8.2 L16 4 L14.6 8.2 Z" fill="#f0b888"/><circle cx="12" cy="13.6" r="7.6" fill="#c8956c"/><path d="M8.2 13.5 Q12 20 15.8 13.5 Q12 17.2 8.2 13.5 Z" fill="#f0b888"/><circle cx="9.1" cy="12.2" r="1" fill="#3a2d22"/><circle cx="14.9" cy="12.2" r="1" fill="#3a2d22"/><path d="M11.4 15.8 L12 17 L12.6 15.8 Z" fill="#3a2d22"/></svg>',

    owl: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M7.8 6.3 L9 3 L9.9 6.6 Z" fill="#e8a87a"/><path d="M16.2 6.3 L15 3 L14.1 6.6 Z" fill="#e8a87a"/><circle cx="12" cy="13.6" r="7.8" fill="#e8a87a"/><circle cx="8.7" cy="12.6" r="2.4" fill="#f0b888"/><circle cx="15.3" cy="12.6" r="2.4" fill="#f0b888"/><circle cx="8.7" cy="12.6" r="1" fill="#3a2d22"/><circle cx="15.3" cy="12.6" r="1" fill="#3a2d22"/><path d="M11.3 15.6 L12 17.1 L12.7 15.6 Z" fill="#3a2d22"/></svg>',

    elephant: '<svg width="24" height="24" viewBox="0 0 24 24"><ellipse cx="3.9" cy="13.5" rx="3.5" ry="5" fill="#d4956a"/><ellipse cx="20.1" cy="13.5" rx="3.5" ry="5" fill="#d4956a"/><circle cx="12" cy="13" r="7.2" fill="#d4956a"/><circle cx="9.3" cy="11.6" r="0.95" fill="#3a2d22"/><circle cx="14.7" cy="11.6" r="0.95" fill="#3a2d22"/><path d="M12 15.5 Q10.5 19 12.3 21 Q13.4 20 12.7 17.8" fill="none" stroke="#d4956a" stroke-width="2.2" stroke-linecap="round"/></svg>',

    mouse: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="5.6" cy="6.2" r="3.1" fill="#c8956c"/><circle cx="18.4" cy="6.2" r="3.1" fill="#c8956c"/><circle cx="12" cy="14" r="7.4" fill="#c8956c"/><ellipse cx="12" cy="16.6" rx="1.6" ry="1.2" fill="#f0b888"/><circle cx="9.3" cy="12.7" r="0.9" fill="#3a2d22"/><circle cx="14.7" cy="12.7" r="0.9" fill="#3a2d22"/><circle cx="12" cy="16.6" r="0.4" fill="#3a2d22"/></svg>',

    duck: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.4" fill="#c8956c"/><circle cx="9.3" cy="11.2" r="0.9" fill="#3a2d22"/><circle cx="14.7" cy="11.2" r="0.9" fill="#3a2d22"/><rect x="8" y="13.2" width="8" height="3.6" rx="1.8" fill="#f0b888" stroke="#3a2d22" stroke-width="0.3"/><line x1="8.3" y1="15" x2="15.7" y2="15" stroke="#3a2d22" stroke-width="0.35"/></svg>',

    seal: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="13.6" r="7.8" fill="#d4956a"/><ellipse cx="12" cy="16.6" rx="3" ry="2.3" fill="#f0b888"/><circle cx="9.1" cy="12.6" r="1.15" fill="#3a2d22"/><circle cx="14.9" cy="12.6" r="1.15" fill="#3a2d22"/><ellipse cx="12" cy="15.8" rx="0.75" ry="0.55" fill="#3a2d22"/><circle cx="5.6" cy="15.5" r="0.35" fill="#3a2d22"/><circle cx="5.6" cy="17" r="0.35" fill="#3a2d22"/><circle cx="18.4" cy="15.5" r="0.35" fill="#3a2d22"/><circle cx="18.4" cy="17" r="0.35" fill="#3a2d22"/></svg>'
};

/**
 * Returns the i18n translation key for the given avatar icon's display label
 * (e.g. 'bear' -> 'avatarIconBear'). Icon keys themselves stay English/lowercase
 * — they're shared with the backend and CSS — only the label shown to the
 * user goes through i18n, so this is the seam an English localization pass
 * hooks into (see TRANSLATIONS.ru.avatarIcon* in i18n.js).
 * @param {string} key
 * @returns {string}
 */
function avatarIconLabelKey(key) {
    return 'avatarIcon' + key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Returns the SVG markup for the given avatar icon key, falling back to the
 * neutral placeholder for unknown or missing keys. Optionally scales the
 * icon's own width/height (its native size differs per icon, e.g. the
 * neutral placeholder is intentionally smaller than the animals) — used to
 * render larger previews in the picker grid while keeping the small account
 * avatar untouched.
 * @param {string} [key]
 * @param {number} [scale] - Multiplier applied to the icon's native size.
 * @returns {string}
 */
function avatarIconMarkup(key, scale) {
    const markup = AVATAR_ICONS[key] || AVATAR_ICONS.neutral;

    if (!scale || scale === 1) return markup;

    return markup.replace(/^<svg width="([\d.]+)" height="([\d.]+)"/,
        (match, w, h) => `<svg width="${(parseFloat(w) * scale).toFixed(1)}" height="${(parseFloat(h) * scale).toFixed(1)}"`);
}
