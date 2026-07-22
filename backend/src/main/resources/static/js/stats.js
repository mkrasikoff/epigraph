/**
 * stats.js — Collection statistics screen for Epigraph (TASK-136).
 *
 * Renders the #stats view (reached from the account menu, not the nav tabs) entirely
 * client-side from the already-loaded global `quotes` array — there is no backend
 * statistics endpoint. Metrics are computed in a single O(n) pass so the screen stays
 * fast on large collections.
 *
 * Depends on:
 * - quotes          {Array} — global quotes array (state.js); tags normalised to string[] (api.js)
 * - t(), quoteCountWord(), applyI18n() — i18n.js
 * - escHtml()       {fn}    — HTML-escape for user content (ui.js)
 * - switchView()    {fn}    — ui.js (empty-state CTA)
 *
 * Provides (globals): computeStats(), renderStats().
 *
 * Called from: switchView('stats') in ui.js.
 */

/** How many months of activity the screen looks back over. */
const STATS_MONTHS_WINDOW = 12;

/** Once a daily streak passes this many days, the fact strip reports it in months instead. */
const STATS_STREAK_MONTH_THRESHOLD = 30;

/**
 * Local-date key ("y-m-d") for streak day-bucketing. Using the Date's own local getters
 * (not a UTC millis divide) keeps "consecutive days" aligned with the user's calendar.
 * @param {Date} d
 * @returns {string}
 */
function statsDayKey(d) {
    return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}

/** How many days count as "recent" for the tile deltas. */
const STATS_RECENT_DAYS = 30;

/**
 * Computes every statistic the screen needs in a single O(n) pass over the quotes.
 * Pure: takes the quotes array, returns a plain data object — no DOM, no i18n. Rendering
 * and localisation happen in renderStats().
 *
 * @param {Array<Object>} list - quotes, each with {text, author, source, fav, tags[], added, ...}
 * @returns {Object} computed metrics (see the returned object below for the shape)
 */
function computeStats(list) {
    const now = Date.now();
    const recentCutoff = now - STATS_RECENT_DAYS * 24 * 60 * 60 * 1000;
    const nowDate = new Date();

    // 12 month buckets, oldest → newest, ending with the current month. monthKeyIndex maps a
    // year*12+month key to its bucket position so the per-quote loop is O(1) per quote.
    const months = [];
    const monthKeyIndex = {};
    for (let i = STATS_MONTHS_WINDOW - 1; i >= 0; i--) {
        const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
        monthKeyIndex[d.getFullYear() * 12 + d.getMonth()] = months.length;
        months.push({ year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }

    const authorCounts = new Map();     // author → total quotes
    const authorFavCounts = new Map();  // author → favorited quotes
    const authorFirstAdded = new Map(); // author → earliest added timestamp
    const sourceSet = new Set();
    const tagCounts = new Map();
    const activeMonths = new Set();     // year*12+month for every quote that has a timestamp
    const activeDays = new Set();       // "y-m-d" local-date key for every datable quote

    let favCount = 0;
    let withSource = 0;
    let savedFromFriends = 0;
    let addedRecent = 0;
    let textLenSum = 0;
    let earliestAdded = null;
    let latestAdded = null;

    for (const q of list) {
        if (q.fav) favCount++;

        textLenSum += (q.text || '').trim().length;

        const author = (q.author || '').trim();
        if (author) {
            authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
            if (q.fav) authorFavCounts.set(author, (authorFavCounts.get(author) || 0) + 1);
        }

        const source = (q.source || '').trim();
        if (source) { sourceSet.add(source); withSource++; }

        // tags is already a string[] after loadData()'s tagsFromCsv() normalisation.
        (q.tags || []).forEach(raw => {
            const tag = (raw || '').trim();
            if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });

        // A quote that originated from someone else — a public share-link import
        // (sharedFromUserId) or a quote saved from a friend's collection (importedFromQuoteId).
        if (q.sharedFromUserId != null || q.importedFromQuoteId != null) savedFromFriends++;

        // Time-based metrics only apply to quotes that carry a timestamp.
        const added = q.added;
        if (typeof added === 'number' && added > 0) {
            if (earliestAdded === null || added < earliestAdded) earliestAdded = added;
            if (latestAdded === null || added > latestAdded) latestAdded = added;
            if (added >= recentCutoff) addedRecent++;

            const d = new Date(added);
            const key = d.getFullYear() * 12 + d.getMonth();
            activeMonths.add(key);
            activeDays.add(statsDayKey(d));
            const bucket = monthKeyIndex[key];
            if (bucket !== undefined) months[bucket].count++;

            if (author) {
                const prev = authorFirstAdded.get(author);
                if (prev === undefined || added < prev) authorFirstAdded.set(author, added);
            }
        }
    }

    const total = list.length;

    // Peak month within the visible window (drives the "record: N in <month>" caption).
    let peakMonthIndex = -1, peakMonthCount = 0;
    months.forEach((m, i) => {
        if (m.count > peakMonthCount) { peakMonthCount = m.count; peakMonthIndex = i; }
    });

    // Current streak: consecutive months ending with this one that each got ≥1 quote. Walks
    // back through activeMonths (not just the 12-window) so a long streak reports its true length.
    let monthStreak = 0;
    for (let cursor = nowDate.getFullYear() * 12 + nowDate.getMonth(); activeMonths.has(cursor); cursor--) {
        monthStreak++;
    }

    // Consecutive-day streak of adding quotes, ending today. A one-day grace lets a streak
    // that hasn't been extended *yet today* still count (anchor slides to yesterday) — the day
    // isn't over. The facts strip shows this in days, switching to monthStreak past 30 days.
    let dayStreak = 0;
    const dayCursor = new Date(nowDate);
    if (!activeDays.has(statsDayKey(dayCursor))) dayCursor.setDate(dayCursor.getDate() - 1);
    while (activeDays.has(statsDayKey(dayCursor))) {
        dayStreak++;
        dayCursor.setDate(dayCursor.getDate() - 1);
    }

    // Authors by quote count (desc) — top list + favorite author. Ties resolve to whichever
    // entry the stable sort saw first; good enough, this isn't a leaderboard.
    const authorsByCount = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topAuthors = authorsByCount.slice(0, 5).map(([name, count]) => ({ name, count }));
    const favAuthor = authorsByCount.length
        ? {
            name: authorsByCount[0][0],
            count: authorsByCount[0][1],
            favCount: authorFavCounts.get(authorsByCount[0][0]) || 0,
        }
        : null;

    const tagsByCount = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
    const topTags = tagsByCount.slice(0, 8).map(([name, count]) => ({ name, count }));
    const favTag = tagsByCount.length ? { name: tagsByCount[0][0], count: tagsByCount[0][1] } : null;

    let newAuthorsRecent = 0;
    authorFirstAdded.forEach(first => { if (first >= recentCutoff) newAuthorsRecent++; });

    let singleQuoteAuthors = 0;
    authorCounts.forEach(c => { if (c === 1) singleQuoteAuthors++; });

    return {
        total,
        distinctAuthors: authorCounts.size,
        distinctSources: sourceSet.size,
        distinctTags: tagCounts.size,
        favCount,
        nonFavCount: total - favCount,
        favPct: total ? Math.round((favCount / total) * 100) : 0,
        favAuthor,
        favTag,
        topAuthors,
        topTags,
        months,
        peakMonthIndex,
        peakMonthCount,
        monthStreak,
        dayStreak,
        avgLength: total ? Math.round(textLenSum / total) : 0,
        savedFromFriends,
        withSourcePct: total ? Math.round((withSource / total) * 100) : 0,
        singleQuoteAuthors,
        newAuthorsRecent,
        addedRecent,
        earliestAdded,
        latestAdded,
    };
}

// =============================================================================
// RENDER
// Builds the whole screen from a computeStats() result: header, Overview tiles,
// hero cards, favorites ring, 12-month activity chart, top authors/tags, the
// "interesting" facts strip — or the empty state for a collection with no quotes.
// =============================================================================

/**
 * Renders the statistics screen into #stats-body from the current `quotes` array.
 * Recomputes on every open (O(n)) — always fresh, no cache to invalidate on add/edit/fav.
 */
function renderStats() {
    const body = document.getElementById('stats-body');
    if (!body) return;

    const s = computeStats(quotes);

    body.innerHTML = s.total === 0 ? statsEmptyMarkup() : statsOverviewMarkup(s);

    // Re-apply translations so the active language wins over the Russian fallback text
    // baked into the [data-i18n] elements in the templates above.
    applyI18n(body);

    if (s.total > 0) animateStatsVisuals();
}

/** Empty state for a collection with no quotes yet. */
function statsEmptyMarkup() {
    return `
        <div class="stats-empty">
            <div class="stats-empty-glyph" aria-hidden="true">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
            </div>
            <div class="stats-empty-title" data-i18n="statsEmptyTitle">Пока нечего показывать</div>
            <div class="stats-empty-text" data-i18n="statsEmptyText">Добавьте первую цитату — и здесь появятся ваши авторы, темы и динамика коллекции.</div>
            <button class="stats-empty-btn" onclick="switchView('add')" data-i18n="statsEmptyBtn">Добавить цитату</button>
        </div>
    `;
}

/** The full data screen: header, Overview tiles, heroes, favorites ring, activity chart,
 *  top authors/tags, and the "interesting" facts strip. */
function statsOverviewMarkup(s) {
    return `
        <header class="stats-header">
            <h2 data-i18n="statsTitle">Статистика коллекции</h2>
            <p class="stats-subtitle" data-i18n="statsSubtitle">Ваша коллекция в цифрах</p>
        </header>

        <div class="stats-section-label" data-i18n="statsSectionOverview">Обзор</div>
        <div class="stats-tiles">
            ${statsTileMarkup(s.total, 'statsTileQuotes',
                s.addedRecent > 0 ? t('statsDeltaAddedMonth', { count: s.addedRecent }) : '')}
            ${statsTileMarkup(s.distinctAuthors, 'statsTileAuthors',
                s.newAuthorsRecent > 0 ? t('statsDeltaNewAuthors', { count: s.newAuthorsRecent }) : '')}
            ${statsTileMarkup(s.distinctSources, 'statsTileSources', t('statsTileSourcesHint'))}
            ${statsTileMarkup(s.distinctTags, 'statsTileTags', t('statsTileTagsHint'))}
        </div>

        <div class="stats-hero-row">
            ${statsFavAuthorHero(s.favAuthor)}
            ${statsFavTagHero(s.favTag)}
        </div>

        <div class="stats-row2">
            ${statsFavRingMarkup(s)}
            ${statsActivityChartMarkup(s)}
        </div>

        <div class="stats-row3">
            ${statsTopAuthorsMarkup(s.topAuthors)}
            ${statsTopTagsMarkup(s.topTags)}
        </div>

        <div class="stats-section-label" data-i18n="statsSectionInteresting">Интересное</div>
        <div class="stats-facts">
            ${statsFactsMarkup(s)}
        </div>
    `;
}

/**
 * One Overview tile.
 * @param {number} value    - the metric number
 * @param {string} labelKey - i18n key for the label under the number
 * @param {string} delta    - already-localised sub-line (may be empty)
 */
function statsTileMarkup(value, labelKey, delta) {
    return `
        <div class="stats-tile">
            <div class="stats-tile-num">${value}</div>
            <div class="stats-tile-lbl" data-i18n="${labelKey}"></div>
            <div class="stats-tile-delta">${escHtml(delta)}</div>
        </div>
    `;
}

/** Favorite-author hero card, or a gentle prompt when no quote has an author yet. */
function statsFavAuthorHero(favAuthor) {
    if (!favAuthor) {
        return statsHeroMarkup('statsHeroFavAuthor',
            t('statsHeroNoAuthorTitle'), t('statsHeroNoAuthorMeta'), '“', 'quote');
    }
    const meta = t('statsHeroAuthorMeta', {
        count: favAuthor.count,
        word: quoteCountWord(favAuthor.count),
        fav: favAuthor.favCount,
    });
    return statsHeroMarkup('statsHeroFavAuthor', escHtml(favAuthor.name), meta, '“', 'quote');
}

/** Favorite-tag hero card, or a prompt when no quote is tagged yet. */
function statsFavTagHero(favTag) {
    if (!favTag) {
        return statsHeroMarkup('statsHeroFavTag',
            t('statsHeroNoTagTitle'), t('statsHeroNoTagMeta'), '#', 'hash');
    }
    const meta = t('statsHeroTagMeta', {
        count: favTag.count,
        word: quoteCountWord(favTag.count),
    });
    return statsHeroMarkup('statsHeroFavTag', '#' + escHtml(favTag.name), meta, '#', 'hash');
}

/**
 * One hero card.
 * @param {string} capKey   - i18n key for the small caption
 * @param {string} big      - already-escaped headline (author name / #tag / prompt)
 * @param {string} meta     - already-escaped meta line
 * @param {string} glyph    - decorative corner glyph (a quote mark / hash), purely visual
 * @param {string} glyphMod - modifier suffix ('quote' | 'hash') so each glyph is sized/placed
 *                            to look visually matched despite differing font metrics
 */
function statsHeroMarkup(capKey, big, meta, glyph, glyphMod) {
    return `
        <div class="stats-hero">
            <div class="stats-hero-glyph stats-hero-glyph--${glyphMod}" aria-hidden="true">${glyph}</div>
            <div class="stats-hero-cap" data-i18n="${capKey}"></div>
            <div class="stats-hero-big">${big}</div>
            <div class="stats-hero-meta">${meta}</div>
        </div>
    `;
}

/** Favorites-vs-regular donut ring with a legend. */
function statsFavRingMarkup(s) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - s.favPct / 100);
    return `
        <div class="stats-card stats-ring-card">
            <div class="stats-ring">
                <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
                    <circle class="stats-ring-track" cx="65" cy="65" r="${r}" fill="none" stroke-width="16"/>
                    <circle class="stats-ring-arc" cx="65" cy="65" r="${r}" fill="none" stroke-width="16"
                        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}"
                        stroke-dashoffset="${circ.toFixed(1)}" data-offset="${offset.toFixed(1)}"
                        transform="rotate(-90 65 65)"/>
                </svg>
                <div class="stats-ring-center">
                    <div class="stats-ring-pct">${s.favPct}%</div>
                    <div class="stats-ring-pl" data-i18n="statsFavRingCenter"></div>
                </div>
            </div>
            <div class="stats-ring-legend">
                <span><span class="stats-dot stats-dot-fav"></span>${t('statsFavLegendFav', { count: s.favCount })}</span>
                <span><span class="stats-dot stats-dot-plain"></span>${t('statsFavLegendPlain', { count: s.nonFavCount })}</span>
            </div>
        </div>
    `;
}

/** 12-month activity bar chart. The peak month is highlighted; the rest are muted. */
function statsActivityChartMarkup(s) {
    const shortMonths = t('statsMonthsShort').split(',');
    const max = s.peakMonthCount;

    const peakBucket = s.months[s.peakMonthIndex];
    const peakCaption = s.peakMonthCount > 0
        ? `<div class="stats-chart-peak">${t('statsChartPeak', {
              count: s.peakMonthCount,
              month: t('statsMonthsPeak').split(',')[peakBucket.month],
              year: peakBucket.year,
          })}</div>`
        : '';

    const bars = s.months.map(m => {
        const pct = max > 0 ? Math.round((m.count / max) * 100) : 0;
        // Highlight every month that ties the record, so equal-height bars never differ in colour.
        const isPeak = m.count === max && m.count > 0;
        return `
            <div class="stats-barcol">
                <span class="stats-actbar-val">${m.count > 0 ? m.count : ''}</span>
                <div class="stats-actbar ${isPeak ? 'stats-actbar-peak' : ''}" style="height:0" data-h="${pct}"></div>
                <span class="stats-actbar-m">${shortMonths[m.month]}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="stats-card stats-chart-card">
            <div class="stats-chart-head">
                <div class="stats-chart-title" data-i18n="statsChartTitle">Активность за 12 месяцев</div>
                ${peakCaption}
            </div>
            <div class="stats-bars">${bars}</div>
        </div>
    `;
}

/** Top-5 authors as ranked bars. Fills animate in on open (width:0 → data-w). */
function statsTopAuthorsMarkup(topAuthors) {
    const body = topAuthors.length === 0
        ? statsInlineEmptyMarkup('author', 'statsAuthorsEmptyText')
        : `<div class="stats-rank-list">${(() => {
            const max = topAuthors[0].count;
            return topAuthors.map((a, i) => `
                <div class="stats-rank">
                    <span class="stats-rank-rk">${i + 1}</span>
                    <span class="stats-rank-nm">${escHtml(a.name)}</span>
                    <span class="stats-rank-track"><span class="stats-rank-fill" style="width:0" data-w="${(a.count / max) * 100}"></span></span>
                    <span class="stats-rank-ct">${a.count}</span>
                </div>
            `).join('');
        })()}</div>`;

    return `
        <div class="stats-card">
            <div class="stats-chart-title" data-i18n="statsTopAuthorsTitle">Топ авторов</div>
            ${body}
        </div>
    `;
}

/** Top tags as weighted chips, with a friendly inline empty state when nothing is tagged. */
function statsTopTagsMarkup(topTags) {
    const body = topTags.length === 0
        ? statsInlineEmptyMarkup('tag', 'statsTagsEmptyText')
        : `<div class="stats-chips">${topTags.map(tag =>
            `<span class="stats-chip">#${escHtml(tag.name)}<b>${tag.count}</b></span>`).join('')}</div>`;

    return `
        <div class="stats-card">
            <div class="stats-chart-title" data-i18n="statsTopTagsTitle">Топ тегов</div>
            ${body}
        </div>
    `;
}

/**
 * Compact inline empty state for a card whose metric has no data yet (no authors, no tags) —
 * a muted icon plus a one-line prompt, echoing the full-screen empty state at a smaller scale.
 * @param {'author'|'tag'} icon  - which line icon to show
 * @param {string} textKey       - i18n key for the prompt
 */
function statsInlineEmptyMarkup(icon, textKey) {
    const svg = icon === 'tag'
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.2"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    return `
        <div class="stats-card-empty">
            <div class="stats-card-empty-icon" aria-hidden="true">${svg}</div>
            <div class="stats-card-empty-text" data-i18n="${textKey}"></div>
        </div>
    `;
}

/**
 * "Interesting" facts strip. Facts that don't apply to the collection (no streak,
 * nothing saved from friends, no datable quotes for an age) are simply left out.
 */
function statsFactsMarkup(s) {
    const facts = [];
    if (s.dayStreak > 0) {
        // Show the streak in days, switching to whole months once it's long enough that a
        // day count would read awkwardly ("47 дней" → "1 месяц").
        const useMonths = s.dayStreak > STATS_STREAK_MONTH_THRESHOLD;
        const n = useMonths ? s.monthStreak : s.dayStreak;
        const word = useMonths ? monthCountWord(n) : dayCountWord(n);
        facts.push(statsFactMarkup('🔥', `${n} ${word}`, 'statsFactStreakLabel'));
    }
    facts.push(statsFactMarkup('📏', s.avgLength, 'statsFactAvgLenLabel'));
    if (s.savedFromFriends > 0) facts.push(statsFactMarkup('🤝', s.savedFromFriends, 'statsFactSavedLabel'));
    facts.push(statsFactMarkup('📚', s.withSourcePct + '%', 'statsFactSourceLabel'));
    if (s.singleQuoteAuthors > 0) facts.push(statsFactMarkup('🌱', s.singleQuoteAuthors, 'statsFactSingleAuthorsLabel'));
    const age = formatCollectionAge(s.earliestAdded);
    if (age) facts.push(statsFactMarkup('🗓️', age, 'statsFactAgeLabel'));
    return facts.join('');
}

/**
 * One fact tile.
 * @param {string} icon     - decorative emoji
 * @param {string|number} value - the metric (number, "%", or age string)
 * @param {string} labelKey - i18n key for the description under the value
 */
function statsFactMarkup(icon, value, labelKey) {
    return `
        <div class="stats-fact">
            <div class="stats-fact-icon" aria-hidden="true">${icon}</div>
            <div class="stats-fact-val">${escHtml(String(value))}</div>
            <div class="stats-fact-lbl" data-i18n="${labelKey}"></div>
        </div>
    `;
}

/**
 * Formats the span from the earliest quote to now as a compact age string
 * ("2 г 3 мес", "5 мес", "< 1 мес"). Returns '' when there is no datable quote.
 * @param {number|null} earliest - Unix millis of the earliest added quote
 * @returns {string}
 */
function formatCollectionAge(earliest) {
    if (!earliest) return '';
    const now = new Date();
    const d = new Date(earliest);
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months--; // current month not yet complete
    if (months < 1) return t('statsAgeLessMonth');

    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years < 1) return `${months} ${t('statsAgeMonthShort')}`;
    return rem > 0
        ? `${years} ${t('statsAgeYearShort')} ${rem} ${t('statsAgeMonthShort')}`
        : `${years} ${t('statsAgeYearShort')}`;
}

/**
 * Animates the screen's data visuals in on open: activity bars grow from 0, the favorites
 * ring arc sweeps to its share, and the top-author bars fill out. Each element ships with its
 * target stashed in a data-* attribute and starts at the "empty" value inline; flipping to the
 * target on the next frame lets the matching CSS transitions play. A second rAF guards against
 * the browser collapsing the set-and-change into one style resolution (no transition then).
 */
function animateStatsVisuals() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll('#stats-body .stats-actbar').forEach(bar => {
            bar.style.height = (bar.dataset.h || 0) + '%';
        });
        document.querySelectorAll('#stats-body .stats-ring-arc').forEach(arc => {
            if (arc.dataset.offset !== undefined) arc.style.strokeDashoffset = arc.dataset.offset;
        });
        document.querySelectorAll('#stats-body .stats-rank-fill').forEach(fill => {
            fill.style.width = (fill.dataset.w || 0) + '%';
        });
    }));
}
