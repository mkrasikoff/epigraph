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

/** Once the usage streak passes this many days, the fact strip reports it in whole months. */
const STATS_STREAK_MONTH_THRESHOLD = 30;

/** Roughly how many days make up a "month" when the streak is shown in months. */
const STATS_DAYS_PER_MONTH = 30;

/** How many days count as "recent" for the tile deltas. */
const STATS_RECENT_DAYS = 30;

// =============================================================================
// CARD REGISTRY
// Standalone metric cards register here by a stable id, so the screen can lay
// them out by tier (free vs Epigraph Plus) and a future profile can pin any card
// by id. The MVP "Обзор" summary block (tiles/heroes/ring/chart/top-lists/facts)
// is intentionally NOT part of this registry — only the standalone metric cards
// added from here on are pinnable. Populated in later chunks (B/C).
// Each entry: { tier: 'free' | 'plus', titleKey, render(stats) -> inner HTML }.
// render() returns the FULL card inner (its own title/sub/viz) so a card is
// self-contained and can be dropped anywhere (stats screen, profile pin slot).
// =============================================================================
const STATS_CARDS = {
    growth:       { tier: 'free', titleKey: 'statsCardGrowth',      render: statsGrowthCard },
    length:       { tier: 'free', titleKey: 'statsCardLength',      render: statsLengthCard },
    wordCloud:    { tier: 'free', titleKey: 'statsCardWordCloud',   render: statsWordCloudCard },
    book:         { tier: 'free', titleKey: 'statsCardBook',        render: statsBookCard },
    language:     { tier: 'free', titleKey: 'statsCardLanguage',    render: statsLanguageCard },
    hall:         { tier: 'free', titleKey: 'statsCardHall',        render: statsHallCard },
    tempo:        { tier: 'free', titleKey: 'statsCardTempo',       render: statsTempoCard },
    heatmap:      { tier: 'plus', titleKey: 'statsCardHeatmap',     render: statsHeatmapCard },
    seasonality:  { tier: 'plus', titleKey: 'statsCardSeasonality', render: statsSeasonalityCard },
    complexity:   { tier: 'plus', titleKey: 'statsCardComplexity', render: statsComplexityCard },
    authorLength: { tier: 'plus', titleKey: 'statsCardAuthorLength', render: statsAuthorLengthCard },
    authorCloud:  { tier: 'plus', titleKey: 'statsCardAuthorCloud', render: statsAuthorCloudCard },
    authorScatter:{ tier: 'plus', titleKey: 'statsCardAuthorScatter', render: statsAuthorScatterCard },
};

/** Last computeStats() result, cached so in-card interactions can re-render without recomputing. */
let statsCurrent = null;

/** Registered cards for a tier, as [{ id, tier, titleKey, render }]. */
function statsCardsByTier(tier) {
    return Object.entries(STATS_CARDS)
        .filter(([, card]) => card.tier === tier)
        .map(([id, card]) => ({ id, ...card }));
}

/** Wraps a card's self-contained inner HTML in the metric-card shell (stable id for pinning). */
function statsRenderCard(card, s) {
    return `<div class="stats-card stats-metric-card" data-card-id="${card.id}">${card.render(s)}</div>`;
}

/** True when the signed-in user has Epigraph Plus. */
function statsIsPlus() {
    return !!(typeof currentUser !== 'undefined' && currentUser && currentUser.plus);
}

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
    const authorWords = new Map();      // author → total words (for avg length per author)
    const authorFirstAdded = new Map(); // author → earliest added timestamp
    const sourceSet = new Set();
    const tagCounts = new Map();
    const monthTotals = new Map();      // year*12+month → count, across ALL months (for the all-time record)

    const lengthBuckets = { short: 0, medium: 0, long: 0 }; // by character count: <80, 80–200, >200
    const langSplit = { ru: 0, en: 0, other: 0 };           // dominant script per quote
    const dayCounts = new Map();                            // y*10000+m*100+d → adds that day

    let favCount = 0;
    let withSource = 0;
    let savedFromFriends = 0;
    let addedRecent = 0;
    let textLenSum = 0;
    let totalWords = 0;
    let maxWords = 0;
    let minWords = Infinity;
    let busiestDayCount = 0;
    let busiestDayTs = null;
    let earliestAdded = null;
    let latestAdded = null;

    for (const q of list) {
        if (q.fav) favCount++;

        const text = (q.text || '').trim();
        textLenSum += text.length;

        // Word count (simple whitespace split — no stopwords/stemmer needed here).
        const words = text ? text.split(/\s+/).length : 0;
        totalWords += words;
        if (words > maxWords) maxWords = words;
        if (words > 0 && words < minWords) minWords = words;

        // Length bucket by character count.
        if (text.length > 0) {
            if (text.length < 80) lengthBuckets.short++;
            else if (text.length <= 200) lengthBuckets.medium++;
            else lengthBuckets.long++;
        }

        // Dominant script → language of the quote (Cyrillic vs Latin letter counts).
        const cyr = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
        const lat = (text.match(/[a-zA-Z]/g) || []).length;
        if (cyr === 0 && lat === 0) langSplit.other++;
        else if (cyr >= lat) langSplit.ru++;
        else langSplit.en++;

        const author = (q.author || '').trim();
        if (author) {
            authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
            authorWords.set(author, (authorWords.get(author) || 0) + words);
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
            monthTotals.set(key, (monthTotals.get(key) || 0) + 1);
            const bucket = monthKeyIndex[key];
            if (bucket !== undefined) months[bucket].count++;

            // Busiest calendar day (for the Hall of Fame).
            const dayKey = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
            const dc = (dayCounts.get(dayKey) || 0) + 1;
            dayCounts.set(dayKey, dc);
            if (dc > busiestDayCount) { busiestDayCount = dc; busiestDayTs = added; }

            if (author) {
                const prev = authorFirstAdded.get(author);
                if (prev === undefined || added < prev) authorFirstAdded.set(author, added);
            }
        }
    }

    const total = list.length;

    // Peak month within the visible 12-month window — scales the bar heights and highlights
    // the tallest bar(s). Distinct from the all-time record below.
    let peakMonthIndex = -1, peakMonthCount = 0;
    months.forEach((m, i) => {
        if (m.count > peakMonthCount) { peakMonthCount = m.count; peakMonthIndex = i; }
    });

    // All-time record month across the whole collection (not just the visible window) — drives
    // the "Record: N in <month> <year>" caption. May fall outside the 12-month chart.
    let allTimePeakCount = 0, allTimePeakKey = -1;
    monthTotals.forEach((count, key) => {
        if (count > allTimePeakCount) { allTimePeakCount = count; allTimePeakKey = key; }
    });
    const allTimePeakYear = allTimePeakKey >= 0 ? Math.floor(allTimePeakKey / 12) : null;
    const allTimePeakMonth = allTimePeakKey >= 0 ? allTimePeakKey % 12 : null;

    // Cumulative growth series — one point per calendar month from the first datable quote to
    // the last (gaps filled so inactive months read as flat), values are running totals.
    const monthKeysSorted = [...monthTotals.keys()].sort((a, b) => a - b);
    const growthSeries = [];
    if (monthKeysSorted.length) {
        let cumulative = 0;
        for (let k = monthKeysSorted[0]; k <= monthKeysSorted[monthKeysSorted.length - 1]; k++) {
            cumulative += monthTotals.get(k) || 0;
            growthSeries.push(cumulative);
        }
    }

    // Tempo: quotes added this calendar quarter vs the previous one (from the all-time month map).
    const nowMonthKey = nowDate.getFullYear() * 12 + nowDate.getMonth();
    const thisQStartKey = nowDate.getFullYear() * 12 + Math.floor(nowDate.getMonth() / 3) * 3;
    const lastQStartKey = thisQStartKey - 3;
    let tempoThisQuarter = 0, tempoLastQuarter = 0;
    monthTotals.forEach((count, key) => {
        if (key >= thisQStartKey && key <= nowMonthKey) tempoThisQuarter += count;
        else if (key >= lastQStartKey && key < thisQStartKey) tempoLastQuarter += count;
    });

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

    // ── Plus-tier aggregates ────────────────────────────────────────────────
    // Additions grouped by month-of-year across all years (seasonality radial).
    const seasonality = new Array(12).fill(0);
    monthTotals.forEach((count, key) => { seasonality[((key % 12) + 12) % 12] += count; });

    // Average words per author — only authors with ≥2 quotes so a single long quote can't top it.
    const authorAvgWords = authorsByCount
        .filter(([, count]) => count >= 2)
        .map(([name, count]) => ({ name, count, avg: Math.round((authorWords.get(name) || 0) / count) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

    // Author cloud — most-quoted authors, sized by count.
    const authorCloud = authorsByCount.slice(0, 8).map(([name, count]) => ({ name, count }));

    // Scatter: quote count × favorite-rate, for authors with ≥2 quotes (else fav-rate is 0/1 noise).
    const authorScatter = authorsByCount
        .filter(([, count]) => count >= 2)
        .slice(0, 16)
        .map(([name, count]) => ({ name, count, favRate: (authorFavCounts.get(name) || 0) / count }));

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
        allTimePeakCount,
        allTimePeakYear,
        allTimePeakMonth,
        growthSeries,
        tempoThisQuarter,
        tempoLastQuarter,
        lengthBuckets,
        langSplit,
        totalWords,
        maxWords,
        minWords: minWords === Infinity ? 0 : minWords,
        busiestDayCount,
        busiestDayTs,
        avgLength: total ? Math.round(textLenSum / total) : 0,
        savedFromFriends,
        withSourcePct: total ? Math.round((withSource / total) * 100) : 0,
        singleQuoteAuthors,
        newAuthorsRecent,
        addedRecent,
        earliestAdded,
        latestAdded,
        seasonality,
        authorAvgWords,
        authorCloud,
        authorScatter,
        wordCloud: statsWordCloud(list),
        complexity: statsComplexity(list),
        dayCounts,
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
    // The usage streak (days in a row using Epigraph) is not derivable from quotes — it lives in
    // the "week_streak" achievement's uncapped progress, the same source the profile/Settings use.
    s.usageStreak = statsUsageStreak();
    statsCurrent = s; // cached for in-card interactions (e.g. cycling the "collection as a book" title)

    body.innerHTML = s.total === 0
        ? statsEmptyMarkup()
        : statsOverviewMarkup(s) + statsFreeCardsSection(s) + statsFactsSection(s) + statsPlusSection(s);

    // Re-apply translations so the active language wins over the Russian fallback text
    // baked into the [data-i18n] elements in the templates above.
    applyI18n(body);

    if (s.total > 0) {
        animateStatsVisuals();
        statsEnsureUsageStreakLoaded(s);
        statsEnsureActivityLoaded();
    }
}

/**
 * Grid of free-tier metric cards from the registry, flowing straight after the Overview block
 * (no section label — the free metrics read as one continuous screen; only the Plus section is
 * a labelled boundary). Empty (renders nothing) until cards are registered.
 */
function statsFreeCardsSection(s) {
    const cards = statsCardsByTier('free');
    if (cards.length === 0) return '';
    return `
        <div class="stats-metric-grid">
            ${cards.map(c => statsRenderCard(c, s)).join('')}
        </div>
    `;
}

/**
 * Epigraph Plus section at the bottom of the screen. Plus users get the full cards; everyone
 * else gets a locked teaser (blurred preview + upgrade CTA). Kept as a separate trailing section,
 * never interleaved with the free content.
 */
function statsPlusSection(s) {
    const cards = statsCardsByTier('plus');
    if (statsIsPlus()) {
        if (cards.length === 0) return '';
        return `
            <div class="stats-section-label stats-plus-label" data-i18n="statsPlusSectionTitle">Epigraph Plus</div>
            <div class="stats-metric-grid">
                ${cards.map(c => statsRenderCard(c, s)).join('')}
            </div>
        `;
    }
    return statsPlusTeaserMarkup();
}

/** Locked teaser shown to non-Plus users: blurred placeholder previews under an upgrade CTA. */
function statsPlusTeaserMarkup() {
    return `
        <div class="stats-section-label stats-plus-label" data-i18n="statsPlusSectionTitle">Epigraph Plus</div>
        <div class="stats-plus-teaser">
            <div class="stats-plus-teaser-preview" aria-hidden="true">
                ${statsTeaserHeatmap()}
            </div>
            <div class="stats-plus-teaser-over">
                <div class="stats-plus-lock" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>
                <div class="stats-plus-teaser-title" data-i18n="statsPlusTeaserTitle">Глубокая аналитика в Epigraph Plus</div>
                <div class="stats-plus-teaser-text" data-i18n="statsPlusTeaserText">Тепловые карты, тональность, сезонность, сравнение с сообществом и другие диаграммы</div>
                <button class="stats-plus-teaser-cta" onclick="openPlusInfo()" data-i18n="statsPlusTeaserCta">Открыть Epigraph Plus</button>
            </div>
        </div>
    `;
}

/**
 * Decorative blurred contribution-heatmap grid behind the Plus teaser — reads as rich "deep
 * analytics" (and nods to the actual "Активность" heatmap Plus card). Purely visual. Uses the
 * same pseudo-random scatter + 5 intensity levels as the design mockup so it looks like real
 * hidden data rather than a smooth gradient; levels are theme-aware (surface-dynamic → primary).
 */
function statsTeaserHeatmap() {
    let cells = '';
    for (let i = 0; i < 7 * 26; i++) {
        const v = statsHeatRand(i * 1.7);
        const lvl = v < 0.5 ? 0 : v < 0.7 ? 1 : v < 0.85 ? 2 : v < 0.95 ? 3 : 4;
        cells += lvl === 0 ? '<span></span>' : `<span class="l${lvl}"></span>`;
    }
    return `<div class="stats-teaser-heat">${cells}</div>`;
}

/** Deterministic pseudo-random in [0,1) — frac(sin(x)·10000), matching the design mockup. */
function statsHeatRand(x) {
    const n = Math.sin(x) * 10000;
    return n - Math.floor(n);
}

/**
 * Info modal about Epigraph Plus, opened from the teaser CTA. There is no in-app purchase flow —
 * Plus is activated by a redeem code (TASK-131) — so this explains the value rather than checking out.
 */
function openPlusInfo() {
    showModal(
        t('statsPlusInfoTitle'),
        `<p style="font-size:var(--text-sm);color:var(--color-text-muted);line-height:1.5">${t('statsPlusInfoBody')}</p>`,
        [{ label: t('statsPlusInfoClose'), cls: 'btn-primary', action: closeModal }]
    );
}

/** The real "days in a row" usage streak, or 0 when the achievements payload isn't loaded yet. */
function statsUsageStreak() {
    return achievementStatuses?.find(a => a.key === 'week_streak')?.progress || 0;
}

/**
 * The achievements payload (which carries the usage streak) is only fetched when Settings opens
 * or after an achievement check — so opening Stats directly can find it unloaded, hiding the
 * streak fact. When that's the case, fetch it once and patch just the facts strip back in, so
 * the rest of the already-rendered screen (and its entrance animations) stays put.
 */
function statsEnsureUsageStreakLoaded(s) {
    if (achievementStatuses !== null || (typeof isGuest !== 'undefined' && isGuest)) return;
    Api.getAchievements().then(list => {
        achievementStatuses = list;
        const facts = document.getElementById('stats-facts');
        if (!facts) return; // user navigated away before the fetch resolved
        s.usageStreak = statsUsageStreak();
        facts.innerHTML = statsFactsMarkup(s);
        applyI18n(facts);
    }).catch(() => {});
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
        <div class="stats-header">
            <h2 data-i18n="statsTitle">Статистика коллекции</h2>
            <p class="stats-subtitle" data-i18n="statsSubtitle">Ваша коллекция в цифрах</p>
        </div>

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
    `;
}

/**
 * The "Интересное" facts strip — its own labelled section (3-column tiles), rendered AFTER the
 * 2-column metric cards so the differing grids don't sit adjacent and read as a broken layout.
 */
function statsFactsSection(s) {
    return `
        <div class="stats-section-label" data-i18n="statsSectionInteresting">Интересное</div>
        <div class="stats-facts" id="stats-facts">
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

    // "Record" is the all-time best month (may be outside the visible window); the highlighted
    // bar(s) below still reflect the window's own peak, which is what scales the chart.
    const peakCaption = s.allTimePeakCount > 0
        ? `<div class="stats-chart-peak">${t('statsChartPeak', {
              count: s.allTimePeakCount,
              month: t('statsMonthsPeak').split(',')[s.allTimePeakMonth],
              year: s.allTimePeakYear,
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
    if (s.usageStreak > 0) {
        // Show the usage streak in days, switching to whole months once it's long enough that a
        // day count would read awkwardly ("47 дней" → "1 месяц").
        const useMonths = s.usageStreak > STATS_STREAK_MONTH_THRESHOLD;
        const n = useMonths ? Math.floor(s.usageStreak / STATS_DAYS_PER_MONTH) : s.usageStreak;
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

// =============================================================================
// FREE METRIC CARDS (chunk B)
// Each returns a self-contained card body (title + sub + viz) for the registry.
// All derived from computeStats() — pure client-side, no backend.
// =============================================================================

/** Average words per page used to turn a word count into a page count for the "book" card. */
const STATS_WORDS_PER_PAGE = 250;

/**
 * Famous books for the playful "collection as a book" comparison (2 Russian classics, 2 foreign,
 * 1 Harry Potter). Word counts are rough. nameKey resolves to the RU genitive ("«Войны и мира»")
 * so it fits "как N × {book}". Each book has a distinct cover-colour emoji so cycling is obvious.
 */
const STATS_BOOKS = [
    { words: 587000, nameKey: 'statsBookWarAndPeace', emoji: '📕' },
    { words: 211000, nameKey: 'statsBookCrimePunishment', emoji: '📘' },
    { words: 122000, nameKey: 'statsBookPridePrejudice', emoji: '📗' },
    { words: 89000,  nameKey: 'statsBookNineteenEightyFour', emoji: '📓' },
    { words: 77000,  nameKey: 'statsBookHarryPotter', emoji: '📙' },
];

/** Which book the "collection as a book" card compares to. Randomised per page load; cycled on click. */
let statsBookIndex = Math.floor(Math.random() * STATS_BOOKS.length);

/** Cycles the "collection as a book" comparison to the next book and re-renders just that card. */
function cycleStatsBook() {
    statsBookIndex = (statsBookIndex + 1) % STATS_BOOKS.length;
    const el = document.querySelector('#stats-body [data-card-id="book"]');
    if (!el || !statsCurrent) return;
    el.innerHTML = statsBookCard(statsCurrent);
    applyI18n(el);
    // Replay the swap animation on the freshly inserted content (reflow to restart it).
    const book = el.querySelector('.stats-book');
    if (book) { book.classList.remove('stats-book-anim'); void book.offsetWidth; book.classList.add('stats-book-anim'); }
}

/** Cumulative growth area chart over the collection's whole lifetime. */
function statsGrowthCard(s) {
    return `
        <div class="stats-chart-title" data-i18n="statsCardGrowth">Рост коллекции</div>
        <div class="stats-card-sub" data-i18n="statsCardGrowthSub">Накопительно за всё время</div>
        ${statsGrowthSvg(s.growthSeries)}
    `;
}

/** Builds the growth area+line SVG from a cumulative series. */
function statsGrowthSvg(series) {
    const W = 300, H = 96;
    if (!series || series.length < 2) {
        return `<svg class="stats-growth-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"></svg>`;
    }
    const max = series[series.length - 1] || 1;
    const n = series.length;
    const pts = series.map((v, i) => [
        (i / (n - 1)) * W,
        H - (v / max) * (H - 4) - 2,
    ]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return `
        <svg class="stats-growth-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <path class="stats-growth-fill" d="${line} L${W},${H} L0,${H} Z"/>
            <path class="stats-growth-line" d="${line}" vector-effect="non-scaling-stroke"/>
        </svg>
    `;
}

/** Histogram of quote lengths: short / medium / long (by character count). */
function statsLengthCard(s) {
    const b = s.lengthBuckets;
    const max = Math.max(b.short, b.medium, b.long, 1);
    const col = (count, labelKey) => `
        <div class="stats-hbar-col">
            <span class="stats-hbar-val">${count}</span>
            <div class="stats-hbar" style="height:${Math.round((count / max) * 100)}%"></div>
            <span class="stats-hbar-lbl" data-i18n="${labelKey}"></span>
        </div>`;
    return `
        <div class="stats-chart-title" data-i18n="statsCardLength">Длина цитат</div>
        <div class="stats-card-sub" data-i18n="statsCardLengthSub">Короткие · средние · длинные</div>
        <div class="stats-hbars">
            ${col(b.short, 'statsLengthShort')}
            ${col(b.medium, 'statsLengthMedium')}
            ${col(b.long, 'statsLengthLong')}
        </div>
    `;
}

/**
 * Word cloud — most frequent words across all quote texts (stemmed, stop-words removed by
 * stats-text.js). "Hero" layout: the single most-common word large on its own line, the rest
 * flowing below sized/faded by frequency (warm accent → grey tail).
 */
function statsWordCloudCard(s) {
    const list = s.wordCloud || [];
    const body = list.length === 0
        ? statsInlineEmptyMarkup('tag', 'statsWordsEmptyText')
        : (() => {
            const max = list[0].count;
            const rest = list.slice(1).map(w => {
                const ratio = w.count / max;
                const size = (0.8 + ratio * 0.8).toFixed(2); // rem
                const tint = Math.round(10 + ratio * 90);
                return `<span style="font-size:${size}rem;color:color-mix(in oklab, var(--color-primary) ${tint}%, var(--color-text-faint))">${escHtml(w.word)}</span>`;
            }).join('');
            return `
                <div class="stats-wordcloud">
                    <span class="stats-wordcloud-hero">${escHtml(list[0].word)}</span>
                    ${rest}
                </div>`;
        })();
    return `
        <div class="stats-chart-title" data-i18n="statsCardWordCloud">Облако слов</div>
        <div class="stats-card-sub" data-i18n="statsCardWordCloudSub">Частые слова в ваших цитатах</div>
        ${body}
    `;
}

/** Playful "how big is my collection as a book" stat — clickable to compare against another book. */
function statsBookCard(s) {
    const book = STATS_BOOKS[statsBookIndex];
    const pages = Math.max(1, Math.round(s.totalWords / STATS_WORDS_PER_PAGE));
    const frac = s.totalWords / book.words;
    const fracStr = frac >= 1 ? frac.toFixed(1) : frac.toFixed(2);
    return `
        <div class="stats-card-head">
            <div>
                <div class="stats-chart-title" data-i18n="statsCardBook">Коллекция как книга</div>
                <div class="stats-card-sub" data-i18n="statsCardBookSub">Объём в страницах</div>
            </div>
            <button class="stats-book-cycle" type="button" onclick="cycleStatsBook()"
                    data-i18n-aria="statsBookCycleAria" aria-label="Показать другую книгу">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
            </button>
        </div>
        <div class="stats-book stats-book--clickable" onclick="cycleStatsBook()">
            <div class="stats-book-ic" aria-hidden="true">${book.emoji}</div>
            <div>
                <div class="stats-book-val">${t('statsBookPages', { count: pages, word: pageCountWord(pages) })}</div>
                <div class="stats-book-sub">${t('statsBookWords', {
                    count: s.totalWords, word: wordCountWord(s.totalWords), frac: fracStr, book: t(book.nameKey),
                })}</div>
            </div>
        </div>
    `;
}

/**
 * Language split by dominant script (Russian / English / other), as a full-width stacked bar +
 * legend. A bar (not a donut) fills the card width, needs no cramped centre label, and reads
 * clearly even for the common 1–2-language case. Colours stay within the warm palette (accent
 * orange + a muted tint), never the clashing gold.
 */
function statsLanguageCard(s) {
    const l = s.langSplit;
    const total = l.ru + l.en + l.other || 1;
    const segs = [
        { count: l.ru, colorCls: 'stats-langc-ru', labelKey: 'statsLangRu' },
        { count: l.en, colorCls: 'stats-langc-en', labelKey: 'statsLangEn' },
        { count: l.other, colorCls: 'stats-langc-other', labelKey: 'statsLangOther' },
    ].filter(seg => seg.count > 0);

    const bar = segs.map(seg =>
        `<span class="${seg.colorCls}" style="flex:${seg.count}"></span>`
    ).join('');

    const legend = segs.map(seg =>
        `<span class="stats-lang-row">
            <i class="stats-dot ${seg.colorCls}"></i>
            <span class="stats-lang-name" data-i18n="${seg.labelKey}"></span>
            <b class="stats-lang-pct">${Math.round((seg.count / total) * 100)}%</b>
            <span class="stats-lang-count">${seg.count}</span>
        </span>`
    ).join('');

    return `
        <div class="stats-chart-title" data-i18n="statsCardLanguage">Язык коллекции</div>
        <div class="stats-card-sub" data-i18n="statsCardLanguageSub">По алфавиту текста</div>
        <div class="stats-langbar" aria-hidden="true">${bar}</div>
        <div class="stats-lang-legend">${legend}</div>
    `;
}

/** "Hall of fame" — record holders of the collection. */
function statsHallCard(s) {
    const fullMonths = t('statsMonthsFull').split(',');
    const rows = [];
    if (s.earliestAdded) {
        const d = new Date(s.earliestAdded);
        rows.push(statsHallRow('🌱', 'statsHallFirst', `${fullMonths[d.getMonth()]} ${d.getFullYear()}`));
    }
    if (s.maxWords > 0) {
        rows.push(statsHallRow('📏', 'statsHallLongest', `${s.maxWords} ${wordCountWord(s.maxWords)}`));
    }
    if (s.minWords > 0) {
        rows.push(statsHallRow('✂️', 'statsHallShortest', `${s.minWords} ${wordCountWord(s.minWords)}`));
    }
    if (s.busiestDayCount > 0) {
        rows.push(statsHallRow('⚡', 'statsHallBusiest', `${s.busiestDayCount} ${quoteCountWord(s.busiestDayCount)}`));
    }
    return `
        <div class="stats-chart-title" data-i18n="statsCardHall">Зал славы</div>
        <div class="stats-card-sub" data-i18n="statsCardHallSub">Рекордсмены коллекции</div>
        <div class="stats-hall">${rows.join('')}</div>
    `;
}

function statsHallRow(icon, labelKey, value) {
    return `
        <div class="stats-hall-row">
            <span class="stats-hall-ic" aria-hidden="true">${icon}</span>
            <span class="stats-hall-lbl" data-i18n="${labelKey}"></span>
            <span class="stats-hall-val">${value}</span>
        </div>`;
}

/** How many quotes were added this calendar quarter vs the previous one. */
function statsTempoCard(s) {
    const prev = s.tempoLastQuarter, cur = s.tempoThisQuarter;
    const max = Math.max(prev, cur, 1);

    const now = new Date();
    const qThis = Math.floor(now.getMonth() / 3);           // 0..3
    const qPrev = (qThis + 3) % 4;                            // previous quarter number (wraps year)
    const qLabel = q => t('statsQuarterLabel', { n: q + 1 });

    // Signed delta vs last quarter; blank when there's no prior quarter to compare against.
    let deltaStr = '', deltaCls = '';
    if (prev > 0) {
        const delta = Math.round(((cur - prev) / prev) * 100);
        deltaStr = `${delta > 0 ? '+' : ''}${delta}%`;
        deltaCls = delta > 0 ? '' : 'is-flat';
    }

    const col = (n, barCls, label) => `
        <div class="stats-tempo-col">
            <span class="stats-tempo-n">${n}</span>
            <div class="stats-tempo-bar ${barCls}" style="height:${Math.round((n / max) * 100)}%"></div>
            <span class="stats-tempo-lbl">${label}</span>
        </div>`;

    return `
        <div class="stats-chart-title" data-i18n="statsCardTempo">Темп добавления</div>
        <div class="stats-card-sub" data-i18n="statsCardTempoSub">Цитат добавлено по кварталам</div>
        <div class="stats-tempo">
            ${col(prev, 'stats-tempo-bar--prev', qLabel(qPrev))}
            <div class="stats-tempo-delta ${deltaCls}">${deltaStr}</div>
            ${col(cur, 'stats-tempo-bar--cur', qLabel(qThis))}
        </div>
    `;
}

// =============================================================================
// PLUS METRIC CARDS (chunk C)
// Deeper analytics, gated to Epigraph Plus. Still pure client-side from computeStats().
// =============================================================================

/** Recent activity day-keys (days the user visited), loaded lazily from the backend; null until then. */
let statsActivityDays = null;

/**
 * Activity calendar: the current month laid out as a familiar Monday-first calendar grid, with
 * days the user visited tinted and days they also added a quote highlighted brighter. Visited-days
 * come from the backend (UserActivityDay); until that fetch resolves, only quote-days show (they
 * imply activity). A single month always fills the card as a symmetric block, unlike the old
 * multi-month grid that only ever populated on the recent (right) edge.
 */
function statsHeatmapCard(s) {
    const now = new Date();
    const rawMonth = t('statsMonthsFull').split(',')[now.getMonth()];
    const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
    const todayCol = (now.getDay() + 6) % 7; // Monday-first column of today's weekday
    const dow = t('statsWeekdaysShort').split(',')
        .map((d, i) => `<span${i === todayCol ? ' class="is-today"' : ''}>${escHtml(d)}</span>`).join('');
    return `
        <div class="stats-chart-title" data-i18n="statsCardHeatmap">Активность</div>
        <div class="stats-card-sub">${t('statsCalendarSub', { month: monthName })}</div>
        <div class="stats-cal-dow">${dow}</div>
        ${statsCalendarGrid(s.dayCounts, statsActivityDays)}
        <div class="stats-heat-legend">
            <span class="stats-cal-cell l-visit"></span><span data-i18n="statsHeatVisit">заходили</span>
            <span class="stats-cal-cell l-quote"></span><span data-i18n="statsHeatQuote">+ цитата</span>
        </div>
    `;
}

/**
 * Builds the current month as a Monday-first calendar: leading blanks pad to the 1st's weekday,
 * then one cell per day. A day is "quote" (brightest) if a quote was added, else "visit" if the
 * user was active, else empty. Today is ringed; future days in this month stay empty placeholders.
 */
function statsCalendarGrid(dayCounts, activitySet) {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth(), todayDate = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday

    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += `<span class="stats-cal-cell is-blank"></span>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = year * 10000 + month * 100 + d;
        let cls = 'stats-cal-cell';
        if ((dayCounts.get(key) || 0) > 0) cls += ' l-quote';
        else if (activitySet && activitySet.has(key)) cls += ' l-visit';
        if (d > todayDate) cls += ' is-future';
        cells += `<span class="${cls}"></span>`;
    }
    return `<div class="stats-cal">${cells}</div>`;
}

/**
 * Fetches the user's recent activity days once (Plus only) and re-renders just the heatmap card
 * with visited-days filled in — same lazy-patch pattern as the usage streak.
 */
function statsEnsureActivityLoaded() {
    if (statsActivityDays !== null || !statsIsPlus()) return;
    Api.getActivityDays().then(dates => {
        statsActivityDays = new Set((dates || []).map(iso => {
            const [y, m, d] = iso.split('-').map(Number);
            return y * 10000 + (m - 1) * 100 + d; // match dayCounts' 0-based month key
        }));
        const card = document.querySelector('#stats-body [data-card-id="heatmap"]');
        if (!card || !statsCurrent) return;
        card.innerHTML = statsHeatmapCard(statsCurrent);
        applyI18n(card);
    }).catch(() => {});
}

/** Radial chart of additions by month of the year (aggregated across all years). */
function statsSeasonalityCard(s) {
    const vals = s.seasonality;
    const max = Math.max(...vals, 1);
    const months = t('statsMonthsFull').split(',');
    const cx = 75, cy = 75, r0 = 22, rMax = 54;
    let spokes = '';
    vals.forEach((v, i) => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        const r1 = r0 + (rMax - r0) * (v / max);
        const x1 = cx + Math.cos(a) * r0, y1 = cy + Math.sin(a) * r0;
        const x2 = cx + Math.cos(a) * r1, y2 = cy + Math.sin(a) * r1;
        const lx = cx + Math.cos(a) * (rMax + 15), ly = cy + Math.sin(a) * (rMax + 15);
        spokes += `<line class="stats-season-spoke" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="6" stroke-linecap="round" opacity="${(0.4 + (v / max) * 0.6).toFixed(2)}"/>`;
        spokes += `<text class="stats-season-lbl" x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle">${months[i].charAt(0).toUpperCase()}</text>`;
    });
    return `
        <div class="stats-chart-title" data-i18n="statsCardSeasonality">Сезонность</div>
        <div class="stats-card-sub" data-i18n="statsCardSeasonalitySub">В какие месяцы вы активнее</div>
        <svg class="stats-season" viewBox="0 0 150 150" aria-hidden="true">
            <circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" class="stats-ring-track" stroke-width="1"/>
            ${spokes}
        </svg>
    `;
}

/**
 * Language complexity — a rough heuristic (from stats-text.js), shown as a gauge arc + one of
 * five qualitative bands + the raw factors + an honest disclaimer. Never surfaces the 0–100 score
 * as a number, since the estimate isn't that precise.
 */
function statsComplexityCard(s) {
    const c = s.complexity;
    const titleSub = `
        <div class="stats-chart-title" data-i18n="statsCardComplexity">Сложность языка</div>
        <div class="stats-card-sub" data-i18n="statsCardComplexitySub">Оценка по длине слов и фраз</div>`;
    if (!c) {
        return `${titleSub}${statsInlineEmptyMarkup('tag', 'statsComplexityEmptyText')}`;
    }
    const label = t('statsComplexityLevels').split(',')[c.band];
    const reason = t('statsComplexityReasons').split('|')[c.band];
    const factors = t('statsComplexityFactors', {
        word: c.avgWordLen.toFixed(1),
        sentence: Math.round(c.avgSentenceLen),
    });
    const dash = 157; // ≈ π·50, the semicircle arc length
    const offset = (dash * (1 - c.score / 100)).toFixed(1);
    return `
        ${titleSub}
        <div class="stats-complexity">
            <svg class="stats-complexity-arc" viewBox="0 0 120 74" aria-hidden="true">
                <path d="M10 64 A50 50 0 0 1 110 64" fill="none" class="stats-complexity-track" stroke-width="11" stroke-linecap="round"/>
                <path d="M10 64 A50 50 0 0 1 110 64" fill="none" class="stats-complexity-fill" stroke-width="11" stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="stats-complexity-text">
                <div class="stats-complexity-lbl">${escHtml(label)}</div>
                <div class="stats-complexity-rsn">${escHtml(reason)}</div>
                <div class="stats-complexity-fac">${escHtml(factors)}</div>
            </div>
        </div>
        <div class="stats-complexity-note">⚠ <span data-i18n="statsComplexityDisclaimer">Приблизительная оценка, а не научный индекс</span></div>
    `;
}

/** Average quote length (in words) for your most-quoted authors — who you quote at length. */
function statsAuthorLengthCard(s) {
    const list = s.authorAvgWords;
    const body = list.length === 0
        ? statsInlineEmptyMarkup('author', 'statsAuthorsEmptyText')
        : `<div class="stats-rank-list">${(() => {
            const max = Math.max(...list.map(a => a.avg), 1);
            return list.map(a => {
                const ratio = a.avg / max;
                const tint = Math.round(45 + ratio * 55); // higher avg → brighter, so bars differ in hue too
                return `
                <div class="stats-rank">
                    <span class="stats-rank-nm">${escHtml(a.name)}</span>
                    <span class="stats-rank-track"><span class="stats-rank-fill" style="width:0;background:color-mix(in oklab, var(--color-primary) ${tint}%, var(--color-surface-dynamic))" data-w="${(ratio * 100).toFixed(0)}"></span></span>
                    <span class="stats-rank-ct">${a.avg}</span>
                </div>`;
            }).join('');
        })()}</div>`;
    return `
        <div class="stats-chart-title" data-i18n="statsCardAuthorLength">Длина цитат по авторам</div>
        <div class="stats-card-sub" data-i18n="statsCardAuthorLengthSub">Среднее слов на цитату</div>
        ${body}
    `;
}

/** Author cloud — most-quoted authors sized by their quote count. */
function statsAuthorCloudCard(s) {
    const list = s.authorCloud;
    const body = list.length === 0
        ? statsInlineEmptyMarkup('author', 'statsAuthorsEmptyText')
        : `<div class="stats-authorcloud">${(() => {
            const max = list[0].count;
            return list.map(a => {
                const ratio = a.count / max;
                const size = (0.85 + ratio * 1.05).toFixed(2); // rem
                const tint = Math.round(6 + ratio * 94); // top authors orange, tail fades toward grey
                return `<span style="font-size:${size}rem;color:color-mix(in oklab, var(--color-primary) ${tint}%, var(--color-text-faint))">${escHtml(a.name)}</span>`;
            }).join('');
        })()}</div>`;
    return `
        <div class="stats-chart-title" data-i18n="statsCardAuthorCloud">Облако авторов</div>
        <div class="stats-card-sub" data-i18n="statsCardAuthorCloudSub">Размер — число цитат</div>
        ${body}
    `;
}

/** Scatter of authors: quote count (x) × favorite rate (y), with quadrant guides. */
function statsAuthorScatterCard(s) {
    const pts = s.authorScatter;
    const W = 300, H = 150, padX = 24, padY = 16;
    let dots = '', hits = '';
    if (pts.length) {
        const maxCount = Math.max(...pts.map(p => p.count), 1);
        pts.forEach(p => {
            const x = padX + (p.count / maxCount) * (W - padX * 2);
            const y = H - padY - p.favRate * (H - padY * 2);
            const rDot = 3 + (p.count / maxCount) * 5;
            const tip = `${p.name} · ${p.count} ${quoteCountWord(p.count)} · ${Math.round(p.favRate * 100)}%`;
            dots += `<circle class="stats-scatter-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rDot.toFixed(1)}"></circle>`;
            // Larger transparent hit-target on top, so hovering a tiny dot reliably shows the tooltip.
            hits += `<circle class="stats-scatter-hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rDot + 8).toFixed(1)}" data-tip="${escHtml(tip)}"></circle>`;
        });
    }
    return `
        <div class="stats-chart-title" data-i18n="statsCardAuthorScatter">Авторы: глубина × любовь</div>
        <div class="stats-card-sub" data-i18n="statsCardAuthorScatterSub">Число цитат × доля избранного</div>
        <div class="stats-scatter-wrap" onmousemove="statsScatterMove(event)" onmouseleave="statsScatterHideTip(event)">
            <svg class="stats-scatter" viewBox="0 0 ${W} ${H}" aria-hidden="true">
                <line class="stats-scatter-axis" x1="${W / 2}" y1="6" x2="${W / 2}" y2="${H - 8}"/>
                <line class="stats-scatter-axis" x1="16" y1="${H / 2}" x2="${W - 12}" y2="${H / 2}"/>
                ${dots}
                ${hits}
            </svg>
            <div class="stats-scatter-tip" hidden></div>
        </div>
        <div class="stats-scatter-legend">
            <span data-i18n="statsScatterX">→ больше цитат</span>
            <span data-i18n="statsScatterY">↑ чаще в избранном</span>
        </div>
    `;
}

/** Positions the scatter tooltip under the cursor when hovering a point's hit-target. */
function statsScatterMove(e) {
    const wrap = e.currentTarget;
    const tip = wrap.querySelector('.stats-scatter-tip');
    if (!tip) return;
    const hit = e.target.closest ? e.target.closest('.stats-scatter-hit') : null;
    if (!hit) { tip.hidden = true; return; }
    tip.textContent = hit.getAttribute('data-tip');
    tip.hidden = false;
    const rect = wrap.getBoundingClientRect();
    tip.style.left = (e.clientX - rect.left) + 'px';
    tip.style.top = (e.clientY - rect.top - 10) + 'px';
}

/** Hides the scatter tooltip when the cursor leaves the plot area. */
function statsScatterHideTip(e) {
    const tip = e.currentTarget.querySelector('.stats-scatter-tip');
    if (tip) tip.hidden = true;
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
