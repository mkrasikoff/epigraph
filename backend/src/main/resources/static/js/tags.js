/**
 * tags.js — Tag management for add-quote form and edit modal in Epigraph.
 *
 * Depends on:
 * - escHtml() {fn} — defined in index.html UTILITIES
 * - t() {fn} — defined in i18n.js
 *
 * Exposes global state:
 * - currentTags {Array} — pending tags for the add-quote form
 * - editTags {Array} — pending tags for the currently open edit modal
 *
 * Internal:
 * - renderTagEditor({ wrapId, tags, onRemove, removeFnName, showInput,
 *     onAddClick, focusOnInput }) {fn} — shared factory that renders the chip list
 *   plus either the inline input or the "+" add button into a wrap element. Both
 *   renderTags() and renderEditTags() are thin wrappers over this.
 */

// =============================================================================
// SHARED TAG EDITOR FACTORY
// =============================================================================
/**
 * Renders the tag chips + add-button (or inline input) into a wrap element.
 * Shared by both the add-quote form and the edit modal.
 *
 * @param {Object} opts
 * @param {string}   opts.wrapId        - id of the container element to render into.
 * @param {string[]} opts.tags          - the tag array to render and mutate.
 * @param {string}   opts.removeFnName  - global fn name used in the chip remove
 *                                         button's inline onclick (e.g. 'removeTag').
 * @param {boolean}  [opts.showInput]   - render the inline input instead of the + button.
 * @param {Function} opts.onAddClick    - click handler for the "+" add button.
 * @param {boolean}  [opts.focusOnInput] - focus the inline input after appending it.
 * @returns {HTMLInputElement|null} the created input element when showInput is true,
 *                                  else null (callers may focus it themselves).
 */
function renderTagEditor(opts) {
    const { wrapId, tags, removeFnName, showInput, onAddClick, focusOnInput } = opts;

    const wrap = document.getElementById(wrapId);
    if (!wrap) return null;

    // Diff against the tags array instead of wiping and rebuilding every chip on every
    // render — otherwise adding or removing one tag replayed the pop-in animation on every
    // other already-settled chip too, making the whole row visibly jump.
    wrap.querySelectorAll('.tag').forEach(chip => {
        if (!tags.includes(chip.dataset.tag)) chip.remove();
    });

    wrap.querySelectorAll('.tag-input, .tag-add-btn').forEach(el => el.remove());

    const existingTags = new Set([...wrap.querySelectorAll('.tag')].map(chip => chip.dataset.tag));

    tags.forEach(tag => {
        if (existingTags.has(tag)) return;

        const chip = document.createElement('span');
        chip.className = 'tag';
        chip.dataset.tag = tag;
        chip.innerHTML = `${escHtml(tag)}<button type="button" onclick="popOutTagChip(this, '${removeFnName}', '${escHtml(tag)}')" aria-label="${t('ariaTagRemove')}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
        wrap.appendChild(chip);
    });

    if (showInput) {
        const input = document.createElement('input');

        input.type = 'text';
        input.className = 'form-input tag-input';
        input.placeholder = t('placeholderTagInput');
        input.maxLength = 50;
        input.autocomplete = 'off';

        const commit = () => {
            const val = input.value.trim();

            if (val && !tags.includes(val)) tags.push(val);

            input.removeEventListener('blur', input._blurHandler);
            rerender();
        };

        function rerender() {
            renderTagEditor({ ...opts, showInput: false });
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.removeEventListener('blur', input._blurHandler);
                commit();
            } else if (e.key === 'Escape') {
                input.removeEventListener('blur', input._blurHandler);
                rerender();
            }
        });

        input._blurHandler = () => commit();
        input.addEventListener('blur', input._blurHandler);
        wrap.appendChild(input);

        if (focusOnInput) input.focus();

        return input;
    }

    const btn = document.createElement('button');

    btn.type = 'button';
    btn.className = 'tag-add-btn';
    btn.setAttribute('aria-label', t('ariaTagAdd'));
    btn.title = t('ariaTagAdd');
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${t('tagAddButtonLabel')}`;
    btn.addEventListener('click', onAddClick);

    wrap.appendChild(btn);

    return null;
}

/**
 * Shrinks and fades out a tag chip, then (after the exit finishes) actually
 * removes the tag and re-renders — renderTagEditor() only touches chips whose
 * tag is genuinely new or genuinely gone, so this is the only animation that
 * plays; already-settled chips are left alone. Clears any still-running
 * entrance animation first, since a `both`-filled animation would otherwise
 * keep overriding the transform/opacity we're about to set here.
 * @param {HTMLElement} btn - The chip's remove button (`this` from the inline onclick).
 * @param {string} removeFnName - Global fn name that actually removes the tag ('removeTag' or 'removeEditTag').
 * @param {string} tag - Tag value to remove.
 */
function popOutTagChip(btn, removeFnName, tag) {
    const chip = btn.closest('.tag');

    if (!chip) {
        window[removeFnName](tag);
        return;
    }

    chip.style.animation = 'none';
    chip.style.transition = 'transform 180ms ease, opacity 180ms ease';
    chip.style.transform = 'scale(0.5)';
    chip.style.opacity = '0';

    setTimeout(() => window[removeFnName](tag), 180);
}

// =============================================================================
// TAGS — ADD FORM
// =============================================================================
/** Pending tags for the add-quote form. */
let currentTags = [];

/**
 * Commits the active inline tag input: trims value, adds tag if non-empty,
 * then switches back to the "+" button state.
 * @param {HTMLInputElement} input
 */
function commitTagInput(input) {
    if (!input) return;

    const val = input.value.trim();

    if (val && !currentTags.includes(val)) {
        currentTags.push(val);
    }

    input.removeEventListener('blur', input._blurHandler);
    renderTags();
}

/**
 * Shows the inline tag input inside the add-quote form.
 */
function showTagInput() {
    renderTags(true);

    const wrap = document.getElementById('tags-wrap');
    const input = wrap?.querySelector('.tag-input');

    if (input) input.focus();
}

/**
 * Removes a tag from the add-form pending list and re-renders.
 * @param {string} tag - Tag value to remove.
 */
function removeTag(tag) {
    currentTags = currentTags.filter(existing => existing !== tag);
    renderTags();
}

/**
 * Re-renders the tag chips + add-button (or inline input) inside the add-quote form.
 * @param {boolean} [showInput=false] - If true, renders the inline input instead of the + button.
 */
function renderTags(showInput) {
    renderTagEditor({
        wrapId: 'tags-wrap',
        tags: currentTags,
        removeFnName: 'removeTag',
        showInput,
        onAddClick: () => showTagInput(),
        focusOnInput: false
    });
}

// =============================================================================
// TAGS — EDIT MODAL
// =============================================================================
/** Mutable tag list for the currently open edit modal. */
let editTags = [];

/**
 * Removes a tag from the edit modal pending list and re-renders.
 * @param {string} tag - Tag value to remove.
 */
function removeEditTag(tag) {
    editTags = editTags.filter(existing => existing !== tag);
    renderEditTags();
}

/**
 * Re-renders the tag chips + add-button (or inline input) inside the edit modal.
 * @param {boolean} [showInput=false] - If true, renders the inline input instead of the + button.
 */
function renderEditTags(showInput) {
    renderTagEditor({
        wrapId: 'edit-tags-wrap',
        tags: editTags,
        removeFnName: 'removeEditTag',
        showInput,
        onAddClick: () => renderEditTags(true),
        focusOnInput: true
    });
}
