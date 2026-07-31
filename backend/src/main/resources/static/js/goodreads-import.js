// "Import from Goodreads" flow (TASK-138). Like the Yandex.Books import, the console script is
// built client-side and copied to the clipboard — Epigraph never talks to goodreads.com or sees
// the user's Goodreads session.
//
// Unlike Yandex, Goodreads has no internal JSON API for a user's quotes and its official API is
// dead (retired 2020, quotes were never in it). But a user's liked/favorited quotes live at
// goodreads.com/quotes/list as plain server-rendered HTML, paginated with ?page=N. So the script
// just fetches those pages under the user's own session and parses the DOM — the same `.quoteText`
// / `.authorOrTitle` markup verified against the live site. No "date liked" is exposed by
// Goodreads, so `added` is stamped at collection time.
//
// Messages the user reads in the console are localized via t() and injected as an `L` object, the
// same shape as the Yandex script (see yandex-import.js). Runtime interpolations that must survive
// into the copied script are escaped (\${...}); ${...} without a backslash is a build-time value.
function buildGoodreadsImportScript() {
  const L = {
    collecting: t('goodreadsScriptCollecting'),
    page: t('goodreadsScriptPage'),
    quotesCollected: t('goodreadsScriptQuotesCollected'),
    done: t('goodreadsScriptDone'),
    noQuotes: t('goodreadsScriptNoQuotes')
  };

  return `(async () => {
  const L = ${JSON.stringify(L)};

  // Pull {text, author, source} out of every .quoteText in a parsed page. The quote body is the
  // run of nodes before the first attribution element (author span / book link), with <br> kept
  // as newlines; the U+2015 separator and the wrapping curly quotes are trimmed. Author is the 1st
  // .authorOrTitle (trailing comma dropped), the book (if any) the 2nd.
  function extractQuotes(doc) {
    const out = [];
    for (const el of doc.querySelectorAll('.quoteText')) {
      const parts = [];
      for (const node of el.childNodes) {
        if (node.nodeType === 1) {
          const cls = node.classList;
          if ((cls && cls.contains('authorOrTitle')) || (node.id || '').startsWith('quote_book_link') || node.nodeName === 'SCRIPT') break;
          if (node.nodeName === 'BR') { parts.push('\\n'); continue; }
          parts.push(node.textContent);
        } else if (node.nodeType === 3) {
          parts.push(node.textContent);
        }
      }
      let text = parts.join('').replace(/[\\s\\u2015]+$/, '').trim();
      text = text.replace(/^[“"']+/, '').replace(/[”"']+$/, '').trim();
      if (!text) continue;
      const spans = el.querySelectorAll('.authorOrTitle');
      const author = spans[0] ? spans[0].textContent.trim().replace(/[,\\s]+$/, '') : '';
      const source = spans[1] ? spans[1].textContent.trim() : '';
      out.push({ text, author, source, added: Date.now() });
    }
    return out;
  }

  console.log(L.collecting);
  const quotes = [];
  const seen = new Set();
  for (let page = 1; page <= 200; page++) {
    const res = await fetch(location.origin + '/quotes/list?page=' + page, { credentials: 'include' });
    if (!res.ok) break;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const pageQuotes = extractQuotes(doc);
    if (!pageQuotes.length) break;
    for (const q of pageQuotes) {
      const key = q.text + '|' + q.author;
      if (seen.has(key)) continue;
      seen.add(key);
      quotes.push(q);
    }
    console.log(\`\${L.page} \${page} — \${L.quotesCollected} \${quotes.length}\`);
    if (!doc.querySelector('a.next_page')) break;
    await new Promise(r => setTimeout(r, 300));
  }

  if (!quotes.length) { console.warn(L.noQuotes); return; }

  console.log(\`\${L.done} \${quotes.length}\`);
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'goodreads-quotes.json';
  a.click();
})();
`;
}

/**
 * Copies the Goodreads export script to the clipboard for pasting into the browser console.
 * @returns {Promise<void>}
 */
async function copyGoodreadsImportScript() {
  try {
    await navigator.clipboard.writeText(buildGoodreadsImportScript());
    toast(t('toastCopied'));
  } catch (e) {
    toast(t('toastCopyError'), 'error');
  }
}
