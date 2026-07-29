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
    duplicates:   { tier: 'free', titleKey: 'statsCardDup',         render: statsDuplicatesCard },
    heatmap:      { tier: 'plus', titleKey: 'statsCardHeatmap',     render: statsHeatmapCard },
    authorScatter:{ tier: 'plus', titleKey: 'statsCardAuthorScatter', render: statsAuthorScatterCard },
    reading:      { tier: 'plus', titleKey: 'statsCardReading',     render: statsReadingTimeCard },
    complexity:   { tier: 'plus', titleKey: 'statsCardComplexity', render: statsComplexityCard },
    mood:         { tier: 'plus', titleKey: 'statsCardMood',        render: statsMoodCard },
    milestones:   { tier: 'plus', titleKey: 'statsCardMilestones', render: statsMilestonesCard },
    authorLength: { tier: 'plus', titleKey: 'statsCardAuthorLength', render: statsAuthorLengthCard },
    authorCloud:  { tier: 'plus', titleKey: 'statsCardAuthorCloud', render: statsAuthorCloudCard },
    seasonality:  { tier: 'plus', titleKey: 'statsCardSeasonality', render: statsSeasonalityCard },
    community:    { tier: 'plus', titleKey: 'statsCardCommunity',    render: statsCommunityCard },
    // Achievement-gated (TASK-137): free cards that stay locked (with a progress teaser) until the
    // required achievement is unlocked. `requires` is the achievement key; its rewardKey is this id.
    rhythm:       { tier: 'achievement', requires: 'quote_days_10', titleKey: 'statsCardRhythm',    render: statsRhythmCard },
    character:    { tier: 'achievement', requires: 'quotes_50',     titleKey: 'statsCardCharacter', render: statsCharacterCard },
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

    // "Ваш ритм" (achievement card): Monday-first weekday histogram + 4 six-hour time-of-day buckets
    // (night/morning/day/evening), over quotes that carry an `added` timestamp.
    const weekday = new Array(7).fill(0);
    const timeOfDay = [0, 0, 0, 0]; // [0–6, 6–12, 12–18, 18–24)
    let datedCount = 0;
    // "Характер цитат" (achievement card): how many quotes are questions / exclamations / carry an
    // ellipsis / contain a digit. Independent flags — a quote can match several.
    let charQuestion = 0, charExclaim = 0, charEllipsis = 0, charNumber = 0, charTextCount = 0;

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

        // Character of the quote — the sentence-final mark is checked past any closing quote/bracket.
        if (text.length > 0) {
            charTextCount++;
            if (/[?]["»”'’)\]]*$/.test(text)) charQuestion++;
            if (/[!]["»”'’)\]]*$/.test(text)) charExclaim++;
            if (text.includes('…') || text.includes('...')) charEllipsis++;
            if (/\d/.test(text)) charNumber++;
        }

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

            // Rhythm: Monday-first weekday + which 6-hour slice of the day.
            datedCount++;
            weekday[(d.getDay() + 6) % 7]++;
            timeOfDay[Math.floor(d.getHours() / 6)]++;

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
        mood: statsSentiment(list),
        milestones: statsMilestones(total, earliestAdded, months, now),
        duplicates: statsDuplicates(list, statsDupIgnoreSet()),
        dayCounts,
        rhythm: { weekday, timeOfDay, dated: datedCount },
        character: { textCount: charTextCount, question: charQuestion, exclaim: charExclaim, ellipsis: charEllipsis, number: charNumber },
    };
}

// Milestone ladder for the collection-size progress track — also the forecast targets.
const STATS_MILESTONE_LADDER = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
const STATS_MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/**
 * Collection milestones + pace forecast, from the quote count and `added` timestamps only.
 * pace = trailing momentum (last ≤6 month-buckets) once the collection is a couple of months
 * old, else the lifetime average — so a fresh burst or a lull is reflected without whipsawing
 * tiny collections. Returns the ladder rungs around the current size, fill within the current
 * rung, current pace, and the estimated calendar month the next rung is reached (null when pace
 * is 0 or every rung is cleared).
 * @returns {Object|null} null when the collection is empty.
 */
function statsMilestones(total, earliestAdded, months, now) {
    if (!total) return null;
    const monthsElapsed = earliestAdded ? Math.max(1, (now - earliestAdded) / STATS_MS_PER_MONTH) : 1;
    const lifetimePace = total / monthsElapsed;

    let recent = 0;
    const span = Math.min(6, months.length);
    for (let i = months.length - span; i < months.length; i++) recent += months[i].count;
    const recentPace = recent / Math.min(span, Math.max(1, Math.ceil(monthsElapsed)));
    const pace = (monthsElapsed >= 2 && recent > 0) ? recentPace : lifetimePace;

    let next = null;
    for (const v of STATS_MILESTONE_LADDER) { if (v > total) { next = v; break; } }

    // Track markers: the two most-recently-reached rungs (when they exist) plus the next rung,
    // laid out on a line spanning [leftmost shown rung … next], with `now` sitting between them.
    const reached = STATS_MILESTONE_LADDER.filter(v => v <= total).slice(-2);
    const leftValue = reached.length ? reached[0] : 0;
    const rightValue = next != null ? next : total;
    const range = Math.max(1, rightValue - leftValue);
    const pos = v => Math.max(0, Math.min(100, Math.round(((v - leftValue) / range) * 100)));
    const rungs = reached.map(v => ({ value: v, pct: pos(v), achieved: true }));
    if (next != null) rungs.push({ value: next, pct: 100, achieved: false });

    let forecast = null;
    if (next && pace > 0) {
        const monthsToNext = Math.ceil((next - total) / pace);
        const d = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + monthsToNext, 1);
        forecast = { monthIndex: d.getMonth(), year: d.getFullYear() };
    }

    // Display pace: whole quotes/month, or quotes/year when slower than one a month.
    const perMonth = pace >= 1;
    return {
        total, next, forecast,
        paceValue: perMonth ? Math.round(pace) : Math.max(1, Math.round(pace * 12)),
        paceUnit: perMonth ? 'month' : 'year',
        track: { nowPct: pos(total), rungs },
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
    // The activity streak (days in a row) is not derivable from quotes — it's computed server-side
    // over user_activity_days and delivered live on /me as currentUser.currentStreak, the single
    // source shared by the facts strip, the activity-card rail, and the Settings profile line.
    s.usageStreak = statsUsageStreak();
    statsCurrent = s; // cached for in-card interactions (e.g. cycling the "collection as a book" title)

    body.innerHTML = s.total === 0
        ? statsEmptyMarkup()
        : statsOverviewMarkup(s) + statsFreeCardsSection(s) + statsFactsSection(s) + statsAchievementSection(s) + statsPlusSection(s);

    // Re-apply translations so the active language wins over the Russian fallback text
    // baked into the [data-i18n] elements in the templates above.
    applyI18n(body);

    if (s.total > 0) {
        animateStatsVisuals();
        statsEnsureUsageStreakLoaded(s);
        statsEnsureActivityLoaded();
        statsEnsureCommunityLoaded();
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

// =============================================================================
// ACHIEVEMENT-GATED SECTION (TASK-137) — "Открываются при росте коллекции"
// Free cards that unlock as the collection grows: each stays a locked teaser
// (achievement name + progress) until its required achievement is unlocked,
// then flips to the real card. Unlock state comes from achievementStatuses,
// the same lazily-loaded payload the facts strip/milestones use.
// =============================================================================

/** True when the achievement gating `requires` is unlocked (false until statuses load). */
function statsAchievementUnlocked(requiresKey) {
    const a = achievementStatuses?.find(x => x.key === requiresKey);
    return !!(a && a.unlocked);
}

/**
 * Labelled section of achievement-gated cards, placed just before the Plus block. Each card is
 * wrapped with a stable id + data-requires so it can be patched in place when achievements load
 * (statsRefreshAchievementCards). Renders nothing until such cards are registered.
 */
function statsAchievementSection(s) {
    const cards = statsCardsByTier('achievement');
    if (cards.length === 0) return '';
    return `
        <div class="stats-section-label" data-i18n="statsSectionAchievement">Открываются при росте коллекции</div>
        <div class="stats-metric-grid">
            ${cards.map(c => statsAchievementCardShell(c, s)).join('')}
        </div>
    `;
}

/** Wraps one gated card: the real render when unlocked, else a locked teaser. */
function statsAchievementCardShell(card, s) {
    const unlocked = statsAchievementUnlocked(card.requires);
    const cls = unlocked ? 'stats-card stats-metric-card' : 'stats-card stats-metric-card stats-locked-card';
    const inner = unlocked ? card.render(s) : statsLockedInner(card);
    return `<div class="${cls}" data-card-id="${card.id}" data-requires="${card.requires}">${inner}</div>`;
}

/**
 * Locked teaser: the card's title (dimmed), the gating achievement's name + condition, and a
 * progress bar toward its threshold. Progress reads from achievementStatuses; 0/0 (a bare lock)
 * until that payload loads, then patched in.
 */
function statsLockedInner(card) {
    const st = achievementStatuses?.find(x => x.key === card.requires);
    // Progress only once the achievements payload has loaded — until then just the lock + name,
    // never a bare "0 / 0" that would flash before the fetch resolves.
    const progress = st
        ? (() => {
            const pct = st.threshold ? Math.min(100, Math.round((st.progress / st.threshold) * 100)) : 0;
            return `<div class="stats-locked-track"><span style="width:${pct}%"></span></div>
                <div class="stats-locked-prog">${st.progress} / ${st.threshold}</div>`;
        })()
        : '';
    return `
        <div class="stats-locked">
            <div class="stats-locked-glyph" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>
            <div class="stats-locked-title">${escHtml(t(card.titleKey))}</div>
            <div class="stats-locked-hint">${t('statsLockedHint', { name: escHtml(t(achievementTitleKey(card.requires))) })}</div>
            ${progress}
        </div>
    `;
}

/**
 * Re-renders every gated card from the current achievementStatuses — called once the payload loads
 * so a card that's actually unlocked flips from its locked teaser to the real thing (and locked
 * ones get their real progress). Replays fill/bar animations on any freshly revealed card.
 */
function statsRefreshAchievementCards() {
    if (!statsCurrent) return;
    statsCardsByTier('achievement').forEach(card => {
        const el = document.querySelector(`#stats-body [data-card-id="${card.id}"]`);
        if (!el) return;
        const unlocked = statsAchievementUnlocked(card.requires);
        el.className = unlocked ? 'stats-card stats-metric-card' : 'stats-card stats-metric-card stats-locked-card';
        el.innerHTML = unlocked ? card.render(statsCurrent) : statsLockedInner(card);
        applyI18n(el);
        if (unlocked) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.querySelectorAll('.stats-rank-fill').forEach(f => { f.style.width = (f.dataset.w || 0) + '%'; });
                el.querySelectorAll('.stats-actbar, .stats-dow-bar').forEach(b => { b.style.height = (b.dataset.h || 0) + '%'; });
            }));
        }
    });
}

/**
 * "Ваш ритм" (unlocked by quote_days_10) — a Monday-first weekday histogram (peak bar highlighted)
 * plus the busiest weekday and favourite time of day, from the quotes' `added` timestamps.
 */
function statsRhythmCard(s) {
    const r = s.rhythm;
    const dows = t('statsWeekdaysShort').split(',');
    // Full weekday names for the "most active" fact — the histogram axis stays
    // abbreviated (7 labels in a row), but the single peak-day fact has room to spell it out.
    const dowsFull = t('statsWeekdaysFull').split(',');
    const max = Math.max(...r.weekday, 1);
    const bars = r.weekday.map((c, i) => {
        const isPeak = c === max && c > 0;
        return `<div class="stats-dow-col">
            <div class="stats-dow-bar ${isPeak ? 'peak' : ''}" style="height:0" data-h="${Math.round((c / max) * 100)}"></div>
            <span class="stats-dow-m">${escHtml(dows[i])}</span>
        </div>`;
    }).join('');

    let peakDay = -1, peakDayCount = 0;
    r.weekday.forEach((c, i) => { if (c > peakDayCount) { peakDayCount = c; peakDay = i; } });
    const todKeys = ['statsTodNight', 'statsTodMorning', 'statsTodDay', 'statsTodEvening'];
    let peakTod = -1, peakTodCount = 0;
    r.timeOfDay.forEach((c, i) => { if (c > peakTodCount) { peakTodCount = c; peakTod = i; } });

    const facts = r.dated > 0 ? `
        <div class="stats-rhythm-facts">
            <div class="stats-rf"><div class="stats-rf-n">${peakDay >= 0 ? escHtml(dowsFull[peakDay]) : '—'}</div><div class="stats-rf-l" data-i18n="statsRhythmPeakDay">активнее всего</div></div>
            <div class="stats-rf"><div class="stats-rf-n">${peakTod >= 0 ? t(todKeys[peakTod]) : '—'}</div><div class="stats-rf-l" data-i18n="statsRhythmPeakTime">любимое время</div></div>
        </div>` : '';

    return `
        <div class="stats-chart-title" data-i18n="statsCardRhythm">Ваш ритм</div>
        <div class="stats-card-sub" data-i18n="statsCardRhythmSub">Когда вы собираете цитаты</div>
        <div class="stats-dow-chart">${bars}</div>
        ${facts}
    `;
}

/**
 * "Характер цитат" (unlocked by quotes_50) — the share of quotes that are questions, exclamations,
 * carry an ellipsis, or contain a digit. Bars are scaled to the largest share so the card reads
 * on typically-small percentages; each label shows the true percentage of the collection.
 */
function statsCharacterCard(s) {
    const c = s.character;
    const total = c.textCount || 1;
    const rows = [
        ['statsCharQuestion', c.question],
        ['statsCharExclaim', c.exclaim],
        ['statsCharEllipsis', c.ellipsis],
        ['statsCharNumber', c.number],
    ];
    const maxShare = Math.max(...rows.map(([, n]) => n / total), 0.0001);
    const body = rows.map(([key, n]) => {
        const share = n / total;
        return `<div class="stats-char-row">
            <span class="stats-char-l" data-i18n="${key}"></span>
            <span class="stats-rank-track"><span class="stats-rank-fill" style="width:0" data-w="${Math.round((share / maxShare) * 100)}"></span></span>
            <span class="stats-char-v">${Math.round(share * 100)}%</span>
        </div>`;
    }).join('');

    return `
        <div class="stats-chart-title" data-i18n="statsCardCharacter">Характер цитат</div>
        <div class="stats-card-sub" data-i18n="statsCardCharacterSub">Вопросы, восклицания и другие знаки</div>
        <div class="stats-char-rows">${body}</div>
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

/**
 * Locked teaser for non-Plus users: a fanned deck of accurate decorative card previews next to a
 * "N analytics in Plus" pitch + upgrade CTA. The count is read live from the registry, so it stays
 * correct as Plus cards are added. Previews are aria-hidden (illustrative, not the user's data).
 */
function statsPlusTeaserMarkup() {
    const count = statsCardsByTier('plus').length;
    return `
        <div class="stats-section-label stats-plus-label" data-i18n="statsPlusSectionTitle">Epigraph Plus</div>
        <div class="stats-plus-teaser">
            <div class="stats-plus-fan" aria-hidden="true">
                <div class="stats-teaser-mini stats-teaser-mini--back">${statsTeaserMini('heat')}</div>
                <div class="stats-teaser-mini stats-teaser-mini--mid">${statsTeaserMini('season')}</div>
                <div class="stats-teaser-mini stats-teaser-mini--front">${statsTeaserMini('mood')}</div>
            </div>
            <div class="stats-plus-pitch">
                <div class="stats-plus-count">
                    <span class="stats-plus-count-n">${count}</span>
                    <span class="stats-plus-count-lbl" data-i18n="statsPlusTeaserCount">аналитик в Epigraph Plus</span>
                </div>
                <ul class="stats-plus-feats">
                    <li><i aria-hidden="true">✓</i><span data-i18n="statsPlusFeatHeat">Тепловые карты активности</span></li>
                    <li><i aria-hidden="true">✓</i><span data-i18n="statsPlusFeatMood">Тональность и настроение</span></li>
                    <li><i aria-hidden="true">✓</i><span data-i18n="statsPlusFeatSeason">Сезонность по месяцам</span></li>
                    <li><i aria-hidden="true">✓</i><span data-i18n="statsPlusFeatCommunity">Сравнение с сообществом</span></li>
                </ul>
                <button class="stats-plus-teaser-cta" onclick="openPlusInfo()" data-i18n="statsPlusTeaserCta">Открыть Epigraph Plus</button>
            </div>
        </div>
    `;
}

/**
 * One decorative preview for the teaser fan — an illustrative thumbnail of a real Plus card
 * (mood spectrum / seasonality radial / activity heatmap). Fixed sample shapes; colours are
 * theme-aware via CSS. Titles reuse the real card i18n keys so they translate for free.
 */
function statsTeaserMini(type) {
    if (type === 'mood') {
        return `<div class="stats-teaser-mini-t" data-i18n="statsCardMood">Настроение</div>
            <div class="stats-teaser-mood"><span style="width:44%"></span><span style="width:38%"></span><span style="width:18%"></span></div>`;
    }
    if (type === 'season') {
        let spokes = '';
        for (let i = 0; i < 12; i++) {
            const ang = (-90 + i * 30) * Math.PI / 180;
            const val = 0.35 + statsHeatRand(i * 2.3 + 9) * 0.65;
            const x0 = (30 + Math.cos(ang) * 7).toFixed(1), y0 = (30 + Math.sin(ang) * 7).toFixed(1);
            const x1 = (30 + Math.cos(ang) * (7 + val * 15)).toFixed(1), y1 = (30 + Math.sin(ang) * (7 + val * 15)).toFixed(1);
            spokes += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round" opacity="${(0.5 + val * 0.5).toFixed(2)}"/>`;
        }
        return `<div class="stats-teaser-mini-t" data-i18n="statsCardSeasonality">Сезонность</div>
            <svg class="stats-teaser-season" viewBox="0 0 60 60"><circle cx="30" cy="30" r="23" fill="none" stroke="var(--color-surface-dynamic)" stroke-width="1"/>${spokes}</svg>`;
    }
    let cells = '';
    for (let i = 0; i < 13 * 5; i++) {
        const v = statsHeatRand(i * 1.7 + 3);
        const lvl = v < 0.5 ? 0 : v < 0.7 ? 1 : v < 0.85 ? 2 : v < 0.95 ? 3 : 4;
        cells += lvl === 0 ? '<span></span>' : `<span class="l${lvl}"></span>`;
    }
    return `<div class="stats-teaser-mini-t" data-i18n="statsCardHeatmap">Активность</div>
        <div class="stats-teaser-heatmini">${cells}</div>`;
}

/** Deterministic pseudo-random in [0,1) — frac(sin(x)·10000), matching the design mockup. */
function statsHeatRand(x) {
    const n = Math.sin(x) * 10000;
    return n - Math.floor(n);
}

/** Where the Plus subscription is arranged (same destination as the Settings support link). */
const PLUS_BOOSTY_URL = 'https://boosty.to/mkrasikoff';

/** Opens the Boosty subscription page in a new tab, then closes the info modal. */
function openPlusBoosty() {
    window.open(PLUS_BOOSTY_URL, '_blank', 'noopener,noreferrer');
    closeModal();
}

/**
 * Info modal about Epigraph Plus, opened from the teaser CTA. There is no in-app purchase flow —
 * Plus is activated by a redeem code after subscribing on Boosty (TASK-131) — so this sells the
 * value (a lead line + a perks list) and links out to Boosty rather than checking out in-app.
 */
function openPlusInfo() {
    const perks = ['statsPlusInfoPerkStats', 'statsPlusInfoPerkTheme', 'statsPlusInfoPerkBadge', 'statsPlusInfoPerkLimit']
        .map(k => `<li>${escHtml(t(k))}</li>`).join('');
    const body = `
        <p class="plus-info-lead">${escHtml(t('statsPlusInfoBody'))}</p>
        <ul class="plus-info-perks">${perks}</ul>
        <p class="plus-info-note">${escHtml(t('statsPlusInfoHow'))}</p>`;
    showModal(
        t('statsPlusInfoTitle'),
        body,
        [
            { label: t('statsPlusInfoClose'), cls: 'btn-secondary', action: closeModal },
            {
                label: t('statsPlusInfoSubscribe'),
                cls: 'btn-primary btn-with-icon',
                // Same lightning glyph as the Settings "Boosty" support link.
                icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
                action: openPlusBoosty,
            },
        ]
    );
}

/** The live "days in a row" streak from /me (currentUser.currentStreak), or 0 when unavailable. */
function statsUsageStreak() {
    return (typeof currentUser !== 'undefined' && currentUser && currentUser.currentStreak) || 0;
}

/**
 * The achievements payload is only fetched when Settings opens or after an achievement check — so
 * opening Stats directly can find it unloaded. When that's the case, fetch it once and patch the
 * pieces that depend on it — the milestones card's achievement line and the achievement-gated
 * cards' locked/unlocked state — in place, so the rest of the already-rendered screen (and its
 * entrance animations) stays put. (The streak fact itself no longer needs this — it reads the live
 * currentUser.currentStreak — but re-rendering the strip with the same value is harmless.)
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
        // The milestones card's achievement line also depends on this payload — patch it in too.
        const mile = document.querySelector('#stats-body [data-card-id="milestones"]');
        if (mile) {
            mile.innerHTML = statsMilestonesCard(s);
            applyI18n(mile);
        }
        // Flip achievement-gated cards to their real state now that unlock status is known.
        statsRefreshAchievementCards();
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

// -----------------------------------------------------------------------------
// Duplicates ("hygiene") — detection lives in stats-text.js; this card shows the
// found pairs (macket 4: side-by-side previews + a match tag) or a reassuring
// "all clean" state. The "not a duplicate" dismiss list is client-only, in
// localStorage — deliberately no backend, it's an auxiliary stats helper.
// -----------------------------------------------------------------------------
const STATS_DUP_IGNORE_KEY = 'epigraph_dup_ignore';
const STATS_DUP_SHOWN = 1; // pairs rendered inline before "+ N more" (one at a time keeps the card short)

/** The set of pair-keys the user marked "not a duplicate" (localStorage-backed). */
function statsDupIgnoreSet() {
    try { return new Set(JSON.parse(localStorage.getItem(STATS_DUP_IGNORE_KEY) || '[]')); }
    catch (e) { return new Set(); }
}

/**
 * Marks a pair "not a duplicate": animates the pair out, then persists to the ignore list,
 * re-detects from live quotes and re-renders the card (revealing the next pair, if any).
 */
function statsDupDismiss(key, btn) {
    const card = document.querySelector('#stats-body [data-card-id="duplicates"]');
    const finalize = () => {
        const set = statsDupIgnoreSet();
        set.add(key);
        try { localStorage.setItem(STATS_DUP_IGNORE_KEY, JSON.stringify([...set])); } catch (e) { /* ignore */ }
        if (!statsCurrent) return;
        statsCurrent.duplicates = statsDuplicates(quotes, set);
        if (card) {
            card.innerHTML = statsDuplicatesCard(statsCurrent);
            applyI18n(card);
            requestAnimationFrame(() => { card.style.minHeight = ''; }); // release lock once next pair is laid out
        }
    };
    const pair = btn && btn.closest ? btn.closest('.stats-dup-pair') : null;
    if (!pair) { finalize(); return; }
    // Freeze the card height so it doesn't shrink (pair leaving) then grow (next pair) — the
    // exit is a plain fade+slide in place; the lock is released once the next pair is laid out.
    if (card) card.style.minHeight = card.offsetHeight + 'px';
    let done = false;
    const run = () => { if (done) return; done = true; finalize(); };
    requestAnimationFrame(() => pair.classList.add('is-removing'));
    pair.addEventListener('transitionend', run, { once: true });
    setTimeout(run, 400);
}

/** First ~50 chars of a quote, whitespace-collapsed, for the duplicate preview. */
function statsDupPreview(text) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    return clean.length > 50 ? clean.slice(0, 50) + '…' : clean;
}

/** Human match label for a duplicate pair. */
function statsDupLabel(p) {
    if (p.kind === 'exact') return t('statsDupExact');
    if (p.kind === 'contained') return t('statsDupContained');
    return t('statsDupSimilar', { pct: Math.round(p.score * 100) });
}

/** Author caption for a pair — one name if shared, both (or the one present) otherwise. */
function statsDupAuthors(p) {
    const a = (p.a.author || '').trim(), b = (p.b.author || '').trim();
    if (a && b && a !== b) return `${a} · ${b}`;
    return a || b || t('statsDupNoAuthor');
}

function statsDuplicatesCard(s) {
    const d = s.duplicates || { pairs: [], pairCount: 0, quoteCount: 0 };
    const badge = d.pairCount
        ? `<span class="stats-dup-badge">${escHtml(t('statsDupBadge', { n: d.pairCount, word: pairCountWord(d.pairCount) }))}</span>`
        : '';
    const head = `
        <div class="stats-card-head">
            <div>
                <div class="stats-chart-title" data-i18n="statsCardDup">Гигиена: дубликаты</div>
                <div class="stats-card-sub" data-i18n="statsCardDupSub">Похожие и повторяющиеся цитаты</div>
            </div>
            ${badge}
        </div>`;

    if (d.pairCount === 0) {
        return `${head}
            <div class="stats-dup-clean">
                <div class="stats-dup-clean-ic" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div>
                    <div class="stats-dup-clean-title" data-i18n="statsDupCleanTitle">Дубликатов нет</div>
                    <div class="stats-dup-clean-sub" data-i18n="statsDupCleanSub">все ваши цитаты уникальны</div>
                </div>
            </div>`;
    }

    const rows = d.pairs.slice(0, STATS_DUP_SHOWN).map(p => {
        const key = statsDupKey(p.a.id, p.b.id);
        return `
            <div class="stats-dup-pair">
                <div class="stats-dup-pair-head">
                    <span class="stats-dup-meta">${escHtml(statsDupAuthors(p))}</span>
                    <span class="stats-dup-tag">${escHtml(statsDupLabel(p))}</span>
                    <button class="stats-dup-x" type="button" onclick="statsDupDismiss('${key}', this)" data-i18n-title="statsDupDismiss" data-i18n-aria="statsDupDismiss" aria-label="не дубликат">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="stats-dup-texts">
                    <span class="stats-dup-q">${escHtml(statsDupPreview(p.a.text))}</span>
                    <span class="stats-dup-q">${escHtml(statsDupPreview(p.b.text))}</span>
                </div>
            </div>`;
    }).join('');

    const remaining = d.pairCount - Math.min(STATS_DUP_SHOWN, d.pairs.length);
    const more = remaining > 0
        ? `<span class="stats-dup-more">${escHtml(t('statsDupMore', { n: remaining, word: pairCountWord(remaining) }))}</span>`
        : '';
    const footer = `
        <div class="stats-dup-footer">
            ${more}
            <button class="stats-dup-view" type="button" onclick="statsDupViewAll()" data-i18n="statsDupViewAll">Показать в «Мои цитаты» →</button>
        </div>`;
    return `${head}<div class="stats-dup-list">${rows}</div>${footer}`;
}

/** Opens "My quotes" filtered to just the quotes involved in duplicates (chip is clearable there). */
function statsDupViewAll() {
    const d = statsCurrent && statsCurrent.duplicates;
    if (!d || !d.quoteIds || !d.quoteIds.length) return;
    dupFilterIds = new Set(d.quoteIds);
    // Reset the tab filter to "all" so the duplicate set isn't intersected with "Favorites",
    // and sync the tab highlight (the first .filter-tab is "all").
    currentFilter = 'all';
    document.querySelectorAll('.filter-tab').forEach((b, i) => b.classList.toggle('active', i === 0));
    location.hash = '#all'; // drives switchView('list') via the router → renderList() reads dupFilterIds
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
    const rail = statsCalRail(s, now);
    return `
        <div class="stats-chart-title" data-i18n="statsCardHeatmap">Активность</div>
        <div class="stats-card-sub">${t('statsCalendarSub', { month: monthName })}</div>
        <div class="stats-cal-row">
            <div class="stats-cal-main">
                <div class="stats-cal-dow">${dow}</div>
                ${statsCalendarGrid(s.dayCounts, statsActivityDays)}
            </div>
            <div class="stats-cal-rail">${rail}</div>
        </div>
        <div class="stats-heat-legend">
            <span class="stats-cal-cell l-visit"></span><span data-i18n="statsHeatVisit">заходили</span>
            <span class="stats-cal-cell l-quote"></span><span data-i18n="statsHeatQuote">+ цитата</span>
            <span class="stats-cal-cell is-today"></span><span data-i18n="statsHeatToday">сегодня</span>
        </div>
    `;
}

/**
 * Side rail beside the month calendar (macket C) — three at-a-glance counts that fill what was
 * empty space: the current streak of consecutive active days, how many days this month had any
 * activity, and how many had a quote added. The streak is the live server value (s.usageStreak
 * ← currentUser.currentStreak, computed over user_activity_days) so it always matches the Settings
 * profile and facts strip; the two day counts are derived here from this month's dayCounts +
 * visited-days set.
 */
function statsCalRail(s, now) {
    const year = now.getFullYear(), month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let quoteDays = 0, activeDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const key = year * 10000 + month * 100 + d;
        const hasQuote = (s.dayCounts.get(key) || 0) > 0;
        const visited = statsActivityDays && statsActivityDays.has(key);
        if (hasQuote) quoteDays++;
        if (hasQuote || visited) activeDays++;
    }
    return statsCalRailTile(s.usageStreak || 0, 'statsRailStreak')
        + statsCalRailTile(activeDays, 'statsRailActive')
        + statsCalRailTile(quoteDays, 'statsRailQuotes');
}

/** One rail tile: a big count over a day-inflected label (e.g. "4 / дня подряд"). */
function statsCalRailTile(n, labelKey) {
    return `
        <div class="stats-cal-rt">
            <div class="stats-cal-rt-n">${n}</div>
            <div class="stats-cal-rt-l">${t(labelKey, { word: dayCountWord(n) })}</div>
        </div>`;
}

/**
 * Builds the current month as a Monday-first calendar: leading blanks pad to the 1st's weekday,
 * then one cell per day. A day is "quote" (brightest) if a quote was added, else "visit" if the
 * user was active, else empty. Today gets a corner dot; future days in this month stay empty placeholders.
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
        if (d === todayDate) cls += ' is-today';
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

// -----------------------------------------------------------------------------
// "Место в сообществе" (community comparison, Plus) — TASK-136.
// The only stat that needs a backend: everything else is computed from the local
// quotes[], but ranking against other users can't be. The nightly snapshot
// (GET /api/stats/community) returns anonymous percentile-threshold arrays; the
// client finds its own standing by looking up its own metrics against them.
// -----------------------------------------------------------------------------

/** Session cache for the community snapshot. null = not fetched; then the response object. */
let statsCommunity = null;

/** Below this cohort a percentile is meaningless (you'd be ranked against ~nobody). */
const STATS_COMMUNITY_MIN_COHORT = 2;

/**
 * Percentile rank (0..100) of `value` within the sorted `thresholds` (101 ints): the
 * largest p whose threshold is ≤ value, i.e. "you are at least as large as p% of people".
 * @returns {number|null} null when there are no thresholds.
 */
function statsPercentileRank(thresholds, value) {
    if (!thresholds || thresholds.length === 0) return null;
    let p = 0;
    for (let i = 0; i < thresholds.length; i++) {
        if (thresholds[i] <= value) p = i;
        else break;
    }
    return p;
}

/** "You are bigger than N%" — the rank, clamped to 1..99 so the copy never claims 0/100%. */
function statsCommBiggerThan(rank) {
    return Math.max(1, Math.min(99, rank));
}

/** "Top N%" — the complement of the rank, clamped to 1..99. */
function statsCommTopPct(rank) {
    return Math.max(1, Math.min(99, 100 - rank));
}

/**
 * The real community size distribution as a smooth curve, with the user marked at
 * their own value. Shape is a kernel-density estimate over the 101 percentile
 * thresholds (a quantile sample of the distribution): the density peaks where
 * collection sizes cluster, so on a right-skewed cohort it's a hump toward the
 * small end with a tail out to the big collectors — and the "you" marker sits at
 * the user's true position on that axis. Smoothed on a sqrt-compressed axis so small,
 * skewed cohorts read as one hump, not a step. aria-hidden — the figures are the headline
 * and bars; this shows *where on the distribution* the user falls.
 * @param {number[]} thresholds - 101 sorted percentile values of collection size
 * @param {number}   value      - the user's own collection size
 */
function statsCommunityCurve(thresholds, value) {
    const W = 300, H = 90, topPad = 10, baseY = H - 3, N = 64;
    // Work on a sqrt-compressed axis: collection sizes are heavily right-skewed, and a
    // linear axis lets one big collector stretch everything into a corner (the "slide with
    // a dip" look). sqrt is monotonic (order and the user's standing are preserved), it just
    // spreads the crowded small end and reins in the tail so the shape reads as one hump.
    const tf = v => Math.sqrt(Math.max(0, v));
    const s = thresholds.map(tf);
    const min = s[0], max = s[s.length - 1];
    const range = Math.max(1e-6, max - min);
    const bw = range / 5; // kernel bandwidth — smaller = wobblier, larger = flatter
    const dens = [];
    for (let i = 0; i <= N; i++) {
        const x = min + (i / N) * range;
        let d = 0;
        for (let k = 0; k < s.length; k++) {
            const u = (x - s[k]) / bw;
            d += Math.exp(-0.5 * u * u); // gaussian kernel
        }
        dens.push(d);
    }
    const peak = Math.max(...dens, 1e-9);
    const pts = dens.map((d, i) => [(i / N) * W, baseY - (d / peak) * (baseY - topPad)]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const youX = Math.max(3, Math.min(W - 3, ((tf(value) - min) / range) * W));
    return `
        <svg class="stats-comm-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <path class="stats-comm-fill" d="M0,${baseY} ${line} L${W},${baseY} Z"/>
            <path class="stats-comm-line" d="${line}" vector-effect="non-scaling-stroke"/>
            <line class="stats-comm-you" x1="${youX.toFixed(1)}" y1="${topPad - 6}" x2="${youX.toFixed(1)}" y2="${baseY}"/>
        </svg>`;
}

/** One breakdown row: label · percentile bar (animated via .stats-rank-fill) · "топ N%". */
function statsCommunityRow(labelKey, rank) {
    return `
        <div class="stats-comm-row">
            <span class="stats-comm-row-l" data-i18n="${labelKey}"></span>
            <span class="stats-rank-track"><span class="stats-rank-fill" style="width:0" data-w="${rank}"></span></span>
            <span class="stats-comm-row-v">${t('statsCommunityTopShort', { pct: statsCommTopPct(rank) })}</span>
        </div>`;
}

/**
 * "Место в сообществе" card. Renders a loading placeholder until the snapshot is
 * fetched (statsEnsureCommunityLoaded patches it in), an "among the first" state
 * while the cohort is too small to rank, or the full comparison otherwise. The
 * headline dramatises collection size; the three rows break down size / activity /
 * favourites. All ranks are computed locally from `s` against the snapshot.
 */
function statsCommunityCard(s) {
    const head = `<div class="stats-chart-title" data-i18n="statsCardCommunity">Место в сообществе</div>
        <div class="stats-card-sub" data-i18n="statsCommunitySub">Как ваша коллекция смотрится рядом с другими</div>`;

    if (statsCommunity === null) {
        return `${head}<div class="stats-comm-note" data-i18n="statsCommunityLoading">Сравниваем с сообществом…</div>`;
    }
    if (!statsCommunity.cohortSize || statsCommunity.cohortSize < STATS_COMMUNITY_MIN_COHORT) {
        return `${head}
            <div class="stats-comm-early">
                <div class="stats-comm-early-glyph" aria-hidden="true">🌱</div>
                <div class="stats-comm-early-title" data-i18n="statsCommunityEarlyTitle">Вы среди первых</div>
                <div class="stats-comm-early-text" data-i18n="statsCommunityEarlyText">Сравнение появится, когда в Epigraph наберётся больше читателей.</div>
            </div>`;
    }

    const sizeRank = statsPercentileRank(statsCommunity.sizePercentiles, s.total) ?? 0;
    const actRank = statsPercentileRank(statsCommunity.activityPercentiles, s.addedRecent) ?? 0;
    const favRank = statsPercentileRank(statsCommunity.favPctPercentiles, s.favPct) ?? 0;

    return `
        ${head}
        <div class="stats-comm-hero">
            <div class="stats-comm-top">${t('statsCommunityTopWord')} <span class="stats-comm-top-n">${statsCommTopPct(sizeRank)}</span><span class="stats-comm-top-pct">%</span></div>
            <div class="stats-comm-sub">${t('statsCommunityBiggerThan', { pct: statsCommBiggerThan(sizeRank) })}</div>
        </div>
        ${statsCommunityCurve(statsCommunity.sizePercentiles, s.total)}
        <div class="stats-comm-legend">
            <span data-i18n="statsCommunityLess">меньше</span>
            <span class="stats-comm-legend-you">${t('statsCommunityYouCount', { count: s.total, word: quoteCountWord(s.total) })}</span>
            <span data-i18n="statsCommunityMore">больше</span>
        </div>
        <div class="stats-comm-rows">
            ${statsCommunityRow('statsCommunityRowSize', sizeRank)}
            ${statsCommunityRow('statsCommunityRowActivity', actRank)}
            ${statsCommunityRow('statsCommunityRowFav', favRank)}
        </div>
    `;
}

/**
 * Fetches the community snapshot once (Plus only) and re-renders just the card —
 * same lazy-patch pattern as the heatmap. Re-animates the freshly inserted rank
 * fills, which the initial animateStatsVisuals() pass missed (card was a placeholder).
 */
function statsEnsureCommunityLoaded() {
    if (statsCommunity !== null || !statsIsPlus()) return;
    Api.getCommunityStats().then(snapshot => {
        statsCommunity = snapshot || { cohortSize: 0 };
        const card = document.querySelector('#stats-body [data-card-id="community"]');
        if (!card || !statsCurrent) return;
        card.innerHTML = statsCommunityCard(statsCurrent);
        applyI18n(card);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            card.querySelectorAll('.stats-rank-fill').forEach(f => { f.style.width = (f.dataset.w || 0) + '%'; });
        }));
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

/** Average reading speed (words/min) for the reading-time estimate — comfortable adult pace. */
const STATS_READING_WPM = 180;

/** Formats a duration in minutes as "4 ч 20 мин" / "45 мин" / "3 ч" (i18n-driven). */
function statsReadingFmt(min) {
    const h = Math.floor(min / 60), m = min % 60;
    if (h > 0 && m > 0) return t('statsReadingHM', { h, m });
    if (h > 0) return t('statsReadingH', { h });
    return t('statsReadingM', { m });
}

/**
 * Reading time — how long it'd take to read the whole collection (totalWords ÷ WPM), presented as
 * relatable equivalents: a couple of numeric anchors (movies / podcast episodes / songs, whichever
 * give a sensible count) plus the single localized flight whose duration is closest to the total.
 * The flight list is per-language (ru: CIS routes, en: European), so it localizes automatically.
 */
function statsReadingTimeCard(s) {
    const total = s.totalWords || 0;
    const titleSub = `
        <div class="stats-chart-title" data-i18n="statsCardReading">Время чтения</div>
        <div class="stats-card-sub" data-i18n="statsCardReadingSub">Сколько читать всю коллекцию</div>`;
    if (total === 0) {
        return `${titleSub}${statsInlineEmptyMarkup('tag', 'statsReadingEmptyText')}`;
    }
    const minutes = Math.max(1, Math.round(total / STATS_READING_WPM));

    // Numeric equivalents: walk anchors large→small, keep the first two that round to ≥1.
    const anchors = [
        { min: 115, emoji: '🎬', line: n => t('statsReadingMovies', { n, word: movieCountWord(n) }) },
        { min: 40, emoji: '🎧', line: n => t('statsReadingPodcast', { n, word: episodeCountWord(n) }) },
        { min: 3.5, emoji: '🎵', line: n => t('statsReadingSongs', { n, word: songCountWord(n) }) },
    ];
    const rows = [];
    for (const a of anchors) {
        const n = Math.round(minutes / a.min);
        if (n >= 1) rows.push({ emoji: a.emoji, text: a.line(n) });
        if (rows.length === 2) break;
    }
    // Nearest flight — only when the total is a sensible flight length.
    if (minutes >= 45) {
        const trips = t('statsReadingTrips').split(';').map(x => {
            const [route, m] = x.split('|');
            return { route, min: parseInt(m, 10) };
        });
        let best = trips[0];
        trips.forEach(tp => { if (Math.abs(tp.min - minutes) < Math.abs(best.min - minutes)) best = tp; });
        rows.push({ emoji: '✈️', text: t('statsReadingFlight', { route: best.route }) });
    }

    const rowsHtml = rows.map(r =>
        `<div class="stats-reading-row"><span class="stats-reading-ic" aria-hidden="true">${r.emoji}</span>${escHtml(r.text)}</div>`
    ).join('');
    return `
        ${titleSub}
        <div class="stats-reading">
            <div class="stats-reading-big">${escHtml(statsReadingFmt(minutes))}</div>
            <div class="stats-reading-rows">${rowsHtml}</div>
        </div>
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

/**
 * Collection mood — share of quotes that read light / neutral / dark by a small tone
 * lexicon (stats-text.js), plus the question-vs-statement split. Reuses the language
 * bar's palette technique (one accent hue at two intensities + a neutral grey), so the
 * three segments can't clash in any theme, light or dark. Honest "≈ approximate" caveat,
 * since it's lexicon-based, not semantic — same spirit as the complexity card.
 */
function statsMoodCard(s) {
    const titleSub = `
        <div class="stats-chart-title" data-i18n="statsCardMood">Настроение коллекции</div>
        <div class="stats-card-sub" data-i18n="statsCardMoodSub">Тональность цитат по словам · ≈ примерно</div>`;
    const m = s.mood;
    if (!m) {
        return `${titleSub}${statsInlineEmptyMarkup('tag', 'statsMoodEmptyText')}`;
    }
    const total = m.light + m.neutral + m.dark || 1;
    // Fixed three columns (light | neutral | dark), matching the mockup's number-over-label
    // layout; a zero segment renders a zero-width bar span but still shows its 0% column.
    const cols = [
        { count: m.light,   barCls: 'stats-moodc-light',   colCls: 'stats-mood-col--light',   labelKey: 'statsMoodLight' },
        { count: m.neutral, barCls: 'stats-moodc-neutral', colCls: 'stats-mood-col--neutral', labelKey: 'statsMoodNeutral' },
        { count: m.dark,    barCls: 'stats-moodc-dark',    colCls: 'stats-mood-col--dark',    labelKey: 'statsMoodDark' },
    ];

    const bar = cols.map(c =>
        `<span class="${c.barCls}" style="flex:${c.count}"></span>`
    ).join('');

    const legend = cols.map(c =>
        `<div class="stats-mood-col ${c.colCls}">
            <b class="stats-mood-pct">${Math.round((c.count / total) * 100)}%</b>
            <span class="stats-mood-lbl" data-i18n="${c.labelKey}"></span>
        </div>`
    ).join('');

    // pct is our own <b> markup (safe), so this line is inserted as HTML, not escaped.
    const qLine = t('statsMoodQuestions', {
        pct: `<b class="stats-mood-hl">${Math.round((m.questions / m.total) * 100)}%</b>`,
    });

    return `
        ${titleSub}
        <div class="stats-langbar" aria-hidden="true">${bar}</div>
        <div class="stats-mood-cols">${legend}</div>
        <div class="stats-mood-q">${qLine}</div>
        <div class="stats-complexity-note">⚠ <span data-i18n="statsMoodDisclaimer">Оценка по словарю, а не по смыслу</span></div>
    `;
}

/**
 * Milestones & forecast — where the collection sits between size milestones, the month it's
 * estimated to reach the next one at the current pace, and (when the achievements payload is
 * loaded) the nearest in-progress achievement. Pure from quotes[]; the achievement line is
 * patched in by statsEnsureUsageStreakLoaded once the payload arrives.
 */
function statsMilestonesCard(s) {
    const titleSub = `
        <div class="stats-chart-title" data-i18n="statsCardMilestones">Вехи и прогноз</div>
        <div class="stats-card-sub" data-i18n="statsCardMilestonesSub">Темп коллекции и ближайшие рубежи</div>`;
    const m = s.milestones;
    if (!m) {
        return `${titleSub}${statsInlineEmptyMarkup('tag', 'statsMileEmptyText')}`;
    }

    const paceStr = t(m.paceUnit === 'month' ? 'statsMilePaceMonth' : 'statsMilePaceYear', { n: m.paceValue });
    const hero = `
        <div class="stats-mile-hero">
            <span class="stats-mile-num">${m.total}</span>
            <span class="stats-mile-word">${escHtml(quoteCountWord(m.total))}</span>
            <span class="stats-mile-pace">· ${escHtml(paceStr)}</span>
        </div>`;

    const track = `
        <div class="stats-mile-track">
            <div class="stats-mile-line"><div class="stats-mile-fill" style="width:${m.track.nowPct}%"></div></div>
            ${m.track.rungs.map(r => `
                <div class="stats-mile-mk ${r.achieved ? 'is-done' : 'is-next'}" style="left:${r.pct}%">
                    <span class="stats-mile-mk-cap">${r.value}</span>
                </div>`).join('')}
            <div class="stats-mile-mk is-now" style="left:${m.track.nowPct}%">
                <span class="stats-mile-mk-now" data-i18n="statsMileNow">сейчас</span>
            </div>
        </div>`;

    // Forecast + nearest achievement as one white paragraph, matching the mockup: the milestone
    // target and the forecast date are accented. The bold spans are our own markup, so the line
    // is injected as HTML — only the achievement title (a translated label) is escaped.
    let forecastHtml;
    if (!m.next) {
        forecastHtml = `<span data-i18n="statsMileMax">Все рубежи взяты — рекордная коллекция</span>`;
    } else {
        const target = `<b class="stats-mile-hl">${m.next} ${escHtml(quoteCountWord(m.next))}</b>`;
        if (m.forecast) {
            const date = `<b class="stats-mile-hl">${t('statsMonthsForecast').split(',')[m.forecast.monthIndex]} ${m.forecast.year}</b>`;
            forecastHtml = t('statsMileForecast', { target, date });
        } else {
            forecastHtml = t('statsMileForecastSlow', { target });
        }
    }
    const ach = statsNearestAchievement();
    if (ach) {
        forecastHtml += ' ' + t('statsMileAch', {
            title: escHtml(t(achievementTitleKey(ach.key))),
            progress: ach.progress,
            threshold: ach.threshold,
        });
    }

    return `${titleSub}${hero}${track}<div class="stats-mile-forecast">${forecastHtml}</div>`;
}

/** Nearest-to-completion in-progress achievement, excluding quote-count badges (the track already shows those). */
function statsNearestAchievement() {
    const statuses = (typeof achievementStatuses !== 'undefined' && achievementStatuses) || [];
    const cand = statuses.filter(a => !a.unlocked && a.threshold > 0 && a.progress < a.threshold && a.rewardType !== 'badge');
    if (!cand.length) return null;
    cand.sort((a, b) => (b.progress / b.threshold) - (a.progress / a.threshold));
    return cand[0];
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
    const W = 300, H = 185, padX = 18, padY = 20;
    let dots = '', hits = '';
    if (pts.length) {
        const maxCount = Math.max(...pts.map(p => p.count), 1);
        pts.forEach(p => {
            const ratio = p.count / maxCount;
            const x = padX + ratio * (W - padX * 2);
            const y = H - padY - p.favRate * (H - padY * 2);
            const rDot = 5 + ratio * 9;
            // Bigger dots (more-quoted authors) are more transparent so they don't hide the small
            // ones they overlap; a 0.4 floor keeps the biggest from vanishing entirely.
            const op = (0.85 - ratio * 0.45).toFixed(2);
            const tip = `${p.name} · ${p.count} ${quoteCountWord(p.count)} · ${Math.round(p.favRate * 100)}%`;
            dots += `<circle class="stats-scatter-dot" style="fill-opacity:${op}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rDot.toFixed(1)}"></circle>`;
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
        document.querySelectorAll('#stats-body .stats-dow-bar').forEach(bar => {
            bar.style.height = (bar.dataset.h || 0) + '%';
        });
    }));
}
