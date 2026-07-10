/**
 * themes.js — Theme style library for Epigraph.
 *
 * Defines the 5 selectable visual theme styles, keyed by the same string the
 * backend stores in User.themeStyle and expects in PATCH /api/user/me/theme.
 * Each style has its own light/dark color palette (see styles.css,
 * `[data-theme-style="X"][data-theme="light|dark"]` blocks) and an animated
 * decorative background (see the #theme-decor markup in index.html). This
 * module only holds the picker's small preview swatches — the real colors
 * live in CSS custom properties and must be kept in sync by hand if a
 * palette changes.
 *
 * Depends on:
 * - (none) — pure data module, load before auth.js/ui.js.
 *
 * Provides (globals):
 * - THEME_STYLE_KEYS      {string[]} — display order for the theme picker
 * - THEME_STYLE_PREVIEWS  {Object}   — key -> { light: {bg,primary,accent}, dark: {...} }
 * - themeStyleLabelKey(key) {fn}     — returns the i18n key for a display label (see i18n.js)
 */

const THEME_STYLE_KEYS = ['classic', 'forest', 'cosmos', 'ocean', 'sunset'];

const THEME_STYLE_PREVIEWS = {
    classic: {
        light: { bg: '#e8e0d0', primary: '#8b5e3c', accent: '#c8956c' },
        dark:  { bg: '#18160f', primary: '#d4956a', accent: '#c8956c' }
    },
    forest: {
        light: { bg: '#eef3e6', primary: '#4d7c3f', accent: '#7fa563' },
        dark:  { bg: '#10160d', primary: '#7fbf5f', accent: '#8fc46f' }
    },
    cosmos: {
        light: { bg: '#eef0fb', primary: '#5b4fc4', accent: '#8a7fd8' },
        dark:  { bg: '#0a0a1a', primary: '#a78bfa', accent: '#c084fc' }
    },
    ocean: {
        light: { bg: '#e4f2f3', primary: '#1c7d8c', accent: '#4fa6b5' },
        dark:  { bg: '#071a1d', primary: '#4fd3e8', accent: '#5fc6d8' }
    },
    sunset: {
        light: { bg: '#fce8e4', primary: '#d9634a', accent: '#e88a6a' },
        dark:  { bg: '#1a0f16', primary: '#ef7fa8', accent: '#d97fa3' }
    }
};

/**
 * Returns the i18n translation key for the given theme style's display label
 * (e.g. 'forest' -> 'themeStyleForest'). Style keys themselves stay
 * English/lowercase — shared with the backend and CSS — only the label
 * shown to the user goes through i18n.
 * @param {string} key
 * @returns {string}
 */
function themeStyleLabelKey(key) {
    return 'themeStyle' + key.charAt(0).toUpperCase() + key.slice(1);
}
