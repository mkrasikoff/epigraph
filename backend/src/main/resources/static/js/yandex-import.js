// Pure data + a couple of DOM-light helpers for the "Import from Yandex Books" flow.
// The console script itself is generated client-side and copied to the clipboard —
// Epigraph never talks to books.yandex.ru or sees the user's Yandex session.
//
// The script is built per-call so the messages the user reads in the browser console are
// localized to the active UI language (TASK-134): the labels are resolved via t() and
// injected into the generated script as a plain `L` object, and the script references
// L.* instead of hardcoded Russian. Runtime values (book counts, names) are still
// interpolated inside the copied script at run time — see the escaped \${...} below.
function buildYandexImportScript() {
  const L = {
    promptLogin: t('yandexScriptPromptLogin'),
    noLogin: t('yandexScriptNoLogin'),
    libraryError: t('yandexScriptLibraryError'),
    collecting: t('yandexScriptCollecting'),
    foundBooks: t('yandexScriptFoundBooks'),
    bookError: t('yandexScriptBookError'),
    processed: t('yandexScriptProcessed'),
    quotesCollected: t('yandexScriptQuotesCollected'),
    done: t('yandexScriptDone')
  };

  return `(async () => {
  const L = ${JSON.stringify(L)};
  const LIBRARY_QUERY = \`
    query GetUserLibrary($userLogin: String!, $params: UserLibraryBooksParamsInput!) {
  user(login: $userLogin) {
    library {
      books(params: $params) {
        cursor
        page {
          __typename
          ... on AudioBook {
            availability {
              ...FAvailability
            }
            progress {
              ...FProgress
            }
            book {
              ...FBook
            }
            listenersCount
          }
          ... on TextBook {
            availability {
              ...FAvailability
            }
            progress {
              ...FProgress
            }
            book {
              ...FBook
            }
            readersCount
          }
          ... on TextSerial {
            episodes {
              total
            }
            availability {
              ...FAvailability
            }
            progress {
              ...FProgress
            }
            book {
              ...FBook
            }
            readersCount
          }
          ... on ComicBook {
            availability {
              ...FAvailability
            }
            progress {
              ...FProgress
            }
            book {
              ...FBook
            }
            readersCount
          }
        }
      }
    }
  }
}

    fragment FAvailability on Availability {
  __typename
  ageRestriction {
    __typename
    name
    value
  }
  state {
    ... on Unavailable {
      __typename
      reason
    }
    ... on Available {
      __typename
      full
    }
  }
}


    fragment FProgress on Progress {
  inLibrary
  finished
  progress
  __typename
}


    fragment FBook on Book {
  uuid
  initUuid
  name
  annotation
  ageRestriction
  editorAnnotation
  cover {
    ...FCover
  }
  topics {
    name
    totalBook
    uuid
  }
  publisher {
    uuid
    name
    avatar {
      ...FCover
    }
  }
  translators {
    uuid
    name
    narrator {
      totalBook
    }
    author {
      totalBook
    }
    author {
      totalBook
    }
    translator {
      totalBook
    }
    avatar {
      ...FCover
    }
  }
  authors {
    ...FPerson
  }
}


    fragment FCover on Cover {
  url
  ratio
  backgroundColorHex
  fromShedevrum
  __typename
}


    fragment FPerson on Person {
  uuid
  hidden
  avatar {
    ...FCover
    __typename
  }
  author {
    totalBook
    __typename
  }
  name
  roles
  narrator {
    totalBook
    __typename
  }
  translator {
    totalBook
    __typename
  }
  __typename
}
    \`;

  const loginMatch = location.pathname.match(/^\\/@([^/]+)/);
  const login = loginMatch ? loginMatch[1] : prompt(L.promptLogin);
  if (!login) { console.error(L.noLogin); return; }

  async function fetchAllBooks() {
    let cursor = '';
    const books = [];
    const seen = new Set();
    while (true) {
      const res = await fetch('https://books.yandex.ru/graphql-proxy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'GetUserLibrary',
          query: LIBRARY_QUERY,
          variables: { userLogin: login, params: { cursor, step: 20, contentFilter: 'TEXTBOOK', state: 'ALL' } }
        })
      });
      const json = await res.json();
      if (json.errors) { console.error(L.libraryError, json.errors); break; }
      const lib = json.data?.user?.library?.books;
      const page = lib?.page ?? [];
      if (!page.length) break;
      for (const item of page) {
        const b = item.book;
        if (!b || seen.has(b.uuid)) continue;
        seen.add(b.uuid);
        books.push({ uuid: b.uuid, name: b.name, authors: (b.authors || []).map(a => a.name).join(', ') });
      }
      const next = lib.cursor;
      if (!next || next === cursor) break;
      cursor = next;
    }
    return books;
  }

  function parseCSV(text) {
    const rows = [];
    let field = '', row = [], inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\\r') { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parseDate(s) {
    const m = s.match(/^(\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2}) ([+-]\\d{2})(\\d{2})$/);
    if (!m) return Date.now();
    return new Date(\`\${m[1]}T\${m[2]}\${m[3]}:\${m[4]}\`).getTime();
  }

  console.log(L.collecting);
  const books = await fetchAllBooks();
  console.log(\`\${L.foundBooks} \${books.length}\`);

  const quotes = [];
  let processed = 0;
  for (const book of books) {
    try {
      const res = await fetch(\`https://books.yandex.ru/reader/p/api/v5/profile/books/\${book.uuid}/quotes_export?format=csv\`, { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSV(text);
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 3 || !r[2]) continue;
          const [book_title, book_authors, content, comment, color, created_at] = r;
          quotes.push({
            text: content,
            author: book_authors || book.authors || '',
            source: book_title || book.name || '',
            added: created_at ? parseDate(created_at) : Date.now()
          });
        }
      }
    } catch (e) {
      console.error(\`\${L.bookError} "\${book.name}":\`, e);
    }
    processed++;
    if (processed % 20 === 0) console.log(\`\${L.processed} \${processed}/\${books.length}, \${L.quotesCollected} \${quotes.length}\`);
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(\`\${L.done} \${quotes.length}\`);
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yandex-books-quotes.json';
  a.click();
})();
`;
}

/**
 * Copies the Yandex Books export script to the clipboard for pasting into the browser console.
 * @returns {Promise<void>}
 */
async function copyYandexImportScript() {
    try {
        await navigator.clipboard.writeText(buildYandexImportScript());
        toast(t('toastCopied'));
    } catch (e) {
        toast(t('toastCopyError'), 'error');
    }
}

/**
 * Switches the visible import source panel ('json' or 'yandex') and updates the toggle buttons.
 * @param {'json'|'yandex'} source
 */
function switchImportSource(source) {
    document.getElementById('import-panel-json').classList.toggle('is-hidden', source !== 'json');
    document.getElementById('import-panel-yandex').classList.toggle('is-hidden', source !== 'yandex');
    document.getElementById('import-tab-json').classList.toggle('is-active', source === 'json');
    document.getElementById('import-tab-yandex').classList.toggle('is-active', source === 'yandex');
    moveToggleIndicator(document.getElementById('import-tab-json').closest('.import-source-toggle'));
}
