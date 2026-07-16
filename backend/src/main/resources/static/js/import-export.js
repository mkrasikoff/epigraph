/**
 * import-export.js — Bulk data operations for Epigraph.
 *
 * JSON import (preview, batched create, rejected-item report), JSON export, copy-all-as-text,
 * and delete-all-quotes. Pairs with yandex-import.js. Extracted from quotes.js (TASK-127).
 *
 * Depends on:
 * - quotes           {Array}    — defined in state.js
 * - modalBusy        {boolean}  — defined in ui.js
 * - Api              {Object}   — defined in api.js
 * - t() / quoteCountWord() {fn} — defined in i18n.js
 * - escHtml() / formatQuoteAsText() / showModal() / closeModal() / toast() {fn} — defined in ui.js
 * - tagsToCsv()      {fn}       — defined in state.js
 * - renderList()     {fn}       — defined in quotes-list.js
 * - checkForNewAchievements() {fn} — defined in achievements.js
 *
 * Provides (globals): importJSON(), exportJSON(), copyAll(), confirmClear(),
 *   downloadRejectedQuotes().
 */

// =============================================================================
// IMPORT / EXPORT
// Bulk JSON import, JSON export, copy-all-as-text, and delete-all operations.
// =============================================================================

/**
 * Reads a user-selected JSON file and shows a preview modal before actually importing.
 * @param {Event} e - The file input change event.
 * @returns {Promise<void>}
 */
async function importJSON(e) {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!Array.isArray(data)) throw new Error(t('importExpectedArray'));

        const valid = data.filter(item => item && item.text);
        if (!valid.length) throw new Error(t('importNoValidItems'));

        showImportPreview(valid);
    } catch (err) {
        toast(t('toastImportError', {message: err.message}));
    }
}

const IMPORT_PREVIEW_COUNT = 5;
const IMPORT_BATCH_SIZE = 20;

/** Set to true by the Stop button; checked between batches in runImport(). */
let importStopRequested = false;

/**
 * Shows a modal with a truncated preview of the quotes about to be imported,
 * letting the user confirm or cancel before any network calls are made.
 * @param {Array<Object>} items - Parsed quote objects with at least a `text` field.
 */
function showImportPreview(items) {
    const preview = items.slice(0, IMPORT_PREVIEW_COUNT);
    const remaining = items.length - preview.length;

    const rows = preview.map(item => `
        <div class="import-preview-row">
            <p class="import-preview-text">${escHtml(item.text)}</p>
            ${(item.author || item.source) ? `
                <p class="import-preview-meta">
                    ${item.author ? `<span class="quote-card-author">${escHtml(item.author)}</span>` : ''}
                    ${item.author && item.source ? '<span class="import-preview-meta-sep"> — </span>' : ''}
                    ${item.source ? `<span class="quote-card-source">${escHtml(item.source)}</span>` : ''}
                </p>
            ` : ''}
        </div>
    `).join('');

    const body = `
        <p class="import-preview-summary">${t('importPreviewSummary', {count: items.length, word: quoteCountWord(items.length)})}</p>
        <div class="import-preview-list">${rows}</div>
        ${remaining > 0 ? `<div class="import-preview-more">${t('importPreviewMore', {count: remaining, word: quoteCountWord(remaining)})}</div>` : ''}
    `;

    showModal(t('importPreviewTitle'), body, [
        {label: t('cancelButton'), cls: 'btn-secondary', id: 'import-cancel-btn', action: () => {
            if (modalBusy) {
                importStopRequested = true;
                document.getElementById('import-cancel-btn').disabled = true;
            } else {
                closeModal();
            }
        }},
        {label: t('importPreviewConfirm', {count: items.length, word: quoteCountWord(items.length)}), cls: 'btn-primary', id: 'import-confirm-btn', action: () => runImport(items)}
    ], true);
}

/**
 * Renders the spinner + live counter into the import confirm button.
 * @param {number} current - Quotes created so far.
 * @param {number} total - Total quotes to import.
 */
function setImportProgress(current, total) {
    const btn = document.getElementById('import-confirm-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-spinner-icon"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ${t('importProgressLabel', {current, total})}`;
}

/**
 * Splits an array into consecutive chunks of at most `size` items.
 * @param {Array} arr
 * @param {number} size
 * @returns {Array<Array>}
 */
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

/** Holds the quotes rejected by the last import, for the "download JSON" button in the summary. */
let lastRejectedItems = [];

/**
 * Downloads the quotes rejected by the last import as a JSON file in the standard import
 * schema, so the user can fix and re-import them.
 */
function downloadRejectedQuotes() {
    const data = lastRejectedItems.map(({quote}) => ({
        text: quote.text,
        author: quote.author || '',
        source: quote.source || '',
        tags: quote.tags || ''
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'epigraph-import-errors.json';
    a.click();
}

/**
 * Replaces the preview modal with a final summary and a single Close button. If any quotes
 * were rejected, shows a truncated preview of them (with the validation reason) plus a
 * button to download all of them as a JSON file.
 * @param {number} added - Quotes actually created.
 * @param {number} total - Quotes that were queued for import.
 * @param {'done'|'stopped'|'error'} outcome
 * @param {Array<{quote: Object, errors: string[]}>} rejectedItems - Quotes the server rejected.
 */
function showImportSummary(added, total, outcome, rejectedItems) {
    const key = outcome === 'stopped' ? 'importSummaryStopped'
        : outcome === 'error' ? 'importSummaryError'
        : 'importSummaryDone';

    lastRejectedItems = rejectedItems;
    const skipped = rejectedItems.length;
    const preview = rejectedItems.slice(0, IMPORT_PREVIEW_COUNT);
    const remaining = skipped - preview.length;

    const rejectedRows = preview.map(({quote, errors}) => `
        <div class="import-preview-row">
            <p class="import-preview-text">${escHtml(quote.text)}</p>
            ${(quote.author || quote.source) ? `
                <p class="import-preview-meta">
                    ${quote.author ? `<span class="quote-card-author">${escHtml(quote.author)}</span>` : ''}
                    ${quote.author && quote.source ? '<span class="import-preview-meta-sep"> — </span>' : ''}
                    ${quote.source ? `<span class="quote-card-source">${escHtml(quote.source)}</span>` : ''}
                </p>
            ` : ''}
            <p class="import-preview-reason">${escHtml((errors || []).map(e => codeToText(e, 'importErrorGeneric')).join(', '))}</p>
        </div>
    `).join('');

    const body = `
        <p class="import-preview-summary">${t(key, {count: added, total, word: quoteCountWord(added)})}</p>
        ${skipped > 0 ? `
            <p class="import-preview-summary">${t('importSummarySkipped', {count: skipped, word: quoteCountWord(skipped)})}</p>
            <div class="import-preview-list">${rejectedRows}</div>
            ${remaining > 0 ? `<div class="import-preview-more">${t('importPreviewMore', {count: remaining, word: quoteCountWord(remaining)})}</div>` : ''}
            <button type="button" class="btn-secondary import-copy-btn" onclick="downloadRejectedQuotes()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                ${t('importDownloadRejectedBtn')}
            </button>
        ` : ''}
    `;

    showModal(t('importPreviewTitle'), body, [
        {label: t('closeButton'), cls: 'btn-primary', action: closeModal}
    ], true);
}

/**
 * Creates the previewed quotes via the batch API, in chunks, after the user has confirmed
 * the import. Supports being stopped mid-way (the in-flight batch always finishes first).
 * @param {Array<Object>} items - Parsed quote objects to create.
 * @returns {Promise<void>}
 */
async function runImport(items) {
    const total = items.length;
    let added = 0;
    let outcome = 'done';
    const rejectedItems = [];

    importStopRequested = false;
    modalBusy = true;
    document.getElementById('import-cancel-btn').textContent = t('importStopBtn');
    setImportProgress(added, total);

    for (const chunk of chunkArray(items, IMPORT_BATCH_SIZE)) {
        if (importStopRequested) {
            outcome = 'stopped';
            break;
        }

        const payloads = chunk.map(item => ({
            text: item.text,
            author: item.author || '',
            source: item.source || '',
            tags: Array.isArray(item.tags) ? tagsToCsv(item.tags) : (item.tags || ''),
            fav: false,
            added: item.added || Date.now()
        }));

        try {
            const res = await Api.createBatch(payloads);
            if (!res.ok) {
                outcome = 'error';
                break;
            }

            const result = await res.json();
            result.saved.forEach(q => {
                q.tags = q.tags ? q.tags.split(',').filter(Boolean) : [];
                quotes.push(q);
            });
            added += result.saved.length;
            rejectedItems.push(...result.rejected);
            setImportProgress(added, total);
        } catch (e) {
            console.error('Batch import error:', e);
            outcome = 'error';
            break;
        }
    }

    modalBusy = false;
    showImportSummary(added, total, outcome, rejectedItems);

    // Fires while the import-summary modal is still open — checkForNewAchievements()
    // defers to a toast in that case rather than replacing it, see showAchievementUnlockModal().
    if (added > 0) checkForNewAchievements();
}

/**
 * Exports the current quotes array as a downloadable JSON file.
 */
function exportJSON() {
    const data = quotes.map(q => ({text: q.text, author: q.author, source: q.source, tags: q.tags, fav: q.fav}));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `epigraph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

/**
 * Copies every quote to the clipboard as a plain-text block.
 */
function copyAll() {
    const text = quotes.map(q => formatQuoteAsText(q)).join('\n\n');
    const btn = document.getElementById('copy-all-btn');

    navigator.clipboard.writeText(text).then(() => {
        toast(t('toastCopied'));

        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> ${t('copiedButtonLabel')}`;
            btn.disabled = true;
            setTimeout(() => {
                btn.innerHTML = original;
                btn.disabled = false;
            }, 2000);
        }
    }).catch(() => toast(t('toastCopyError')));
}

/**
 * Prompts the user for confirmation and deletes every quote.
 */
function confirmClear() {
    const phrase = t('deleteAllConfirmPhrase');
    showModal(
        t('deleteAllModalTitle'),
        `${t('deleteAllModalBody', {count: quotes.length})}
         <p style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted)">
             ${t('deleteConfirmHint')}<br><strong>${phrase}</strong>
         </p>
          <input id="delete-confirm-input" class="modal-confirm-input"
                placeholder="${t('deleteAllConfirmPlaceholder')}"
                                oninput="
                    var btn = document.getElementById('modal-delete-btn');
                    if (this.value === '${phrase}') {
                        btn.removeAttribute('disabled');
                        btn.style.opacity = '';
                        btn.style.pointerEvents = '';
                    } else {
                        btn.setAttribute('disabled', 'true');
                        btn.style.opacity = '0.45';
                        btn.style.pointerEvents = 'none';
                    }
                ">`,
        [
            {label: t('cancelButton'), cls: 'btn-secondary', action: closeModal},
            {
                label: t('deleteAccountButton'),
                cls: 'btn-danger',
                id: 'modal-delete-btn',
                action: async () => {
                    try {
                        await Api.deleteAll();
                        quotes = [];
                        renderList();
                        closeModal();
                        toast(t('toastAllQuotesDeleted'));
                    } catch (e) {
                        toast(t('toastError'));
                    }
                }
            }
        ]
    );

    // Disable button until phrase is typed
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const btn = document.getElementById('modal-delete-btn');
        if (btn) {
            btn.setAttribute('disabled', 'true');
            btn.style.opacity = '0.45';
            btn.style.pointerEvents = 'none';
        }
    }));
}
