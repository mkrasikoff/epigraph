// =============================================================================
// stats-text.js — text-analysis layer for the statistics screen.
//
// Pure, DOM-free helpers shared by text-based metrics (word cloud today; reading
// time / language complexity / duplicates later). Loaded before stats.js.
//
// Pipeline: tokenize → drop stop-words & short tokens → Snowball-stem (ru + en,
// picked per token by script) → count by stem, remembering the most frequent
// surface form to display. Runs synchronously; if large collections ever make
// this janky, statsWordCloud() is the natural unit to move into a Web Worker.
// =============================================================================

/**
 * Common Russian + English stop-words (and their frequent inflected forms), kept
 * as raw lowercased surface forms so filtering happens before stemming. Not
 * exhaustive — just enough to keep the cloud meaningful rather than full of
 * "и / the / это / that".
 */
const STATS_STOPWORDS = new Set([
    // Russian — conjunctions, prepositions, pronouns, particles, common verbs.
    'и', 'а', 'но', 'да', 'или', 'либо', 'ни', 'же', 'бы', 'ли', 'то', 'что', 'чтобы',
    'как', 'так', 'вот', 'уже', 'ещё', 'еще', 'тут', 'там', 'здесь', 'где', 'когда',
    'если', 'потому', 'поэтому', 'зато', 'однако', 'хотя', 'также', 'тоже', 'разве',
    'в', 'во', 'на', 'за', 'по', 'из', 'из-за', 'от', 'до', 'к', 'ко', 'с', 'со', 'у',
    'о', 'об', 'обо', 'про', 'над', 'под', 'при', 'без', 'для', 'через', 'между',
    'я', 'ты', 'он', 'она', 'оно', 'мы', 'вы', 'они', 'меня', 'тебя', 'его', 'её', 'ее',
    'нас', 'вас', 'их', 'мне', 'тебе', 'ему', 'ей', 'нам', 'вам', 'им', 'себя', 'себе',
    'мой', 'моя', 'моё', 'мое', 'мои', 'твой', 'наш', 'ваш', 'свой', 'своя', 'своё', 'свои',
    'этот', 'эта', 'это', 'эти', 'тот', 'та', 'те', 'такой', 'такая', 'такие', 'весь',
    'вся', 'всё', 'все', 'сам', 'сама', 'само', 'сами', 'кто', 'чем', 'чём', 'кого', 'чего',
    'не', 'нет', 'ну', 'уж', 'аж', 'лишь', 'только', 'даже', 'вон', 'бывает',
    'быть', 'был', 'была', 'было', 'были', 'есть', 'нету', 'будет', 'будут', 'будь',
    'мочь', 'может', 'можно', 'нужно', 'надо', 'стал', 'стало', 'стали', 'стать',
    'который', 'которая', 'которое', 'которые', 'этому', 'этого', 'того', 'тем', 'этим',
    // English.
    'the', 'a', 'an', 'and', 'or', 'but', 'nor', 'so', 'yet', 'as', 'if', 'than', 'then',
    'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'into', 'from', 'up', 'down',
    'out', 'off', 'over', 'under', 'again', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'not', 'only', 'own', 'same', 'too', 'very', 'can', 'will', 'just', 'now',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
    'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'who', 'whom',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'has',
    'have', 'had', 'having', 'would', 'should', 'could', 'may', 'might', 'must', 'shall',
]);

/** Splits text into lowercased alphabetic tokens (Cyrillic or Latin runs), ё→е normalised. */
function statsTokenize(text) {
    return (text || '').toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я]+/g) || [];
}

// -----------------------------------------------------------------------------
// Russian Snowball (Porter) stemmer. Ordered-alternation port of the reference
// algorithm — approximate but stable enough to collapse inflected forms of the
// same word into one cloud entry. Endings are matched within the RV region only.
// -----------------------------------------------------------------------------
const STATS_RU_RVRE = /^(.*?[аеиоуыэюя])(.*)$/;
const STATS_RU_PERFECTIVE = /((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/;
const STATS_RU_REFLEXIVE = /(с[яь])$/;
const STATS_RU_ADJECTIVE = /(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/;
const STATS_RU_PARTICIPLE = /((ивш|ывш|ующ)|((?<=[ая])(ем|нн|вш|ющ|щ)))$/;
const STATS_RU_VERB = /((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/;
const STATS_RU_NOUN = /(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
const STATS_RU_DERIVATIONAL = /(ост|ость)$/;
const STATS_RU_SUPERLATIVE = /(ейше|ейш)$/;

function statsStemRu(word) {
    const m = STATS_RU_RVRE.exec(word);
    if (!m) return word;
    const head = m[1];
    let rv = m[2];

    // Step 1: perfective gerund; else reflexive, then adjectival / verb / noun.
    let so = rv.replace(STATS_RU_PERFECTIVE, '');
    if (so === rv) {
        rv = rv.replace(STATS_RU_REFLEXIVE, '');
        so = rv.replace(STATS_RU_ADJECTIVE, '');
        if (so !== rv) {
            rv = so.replace(STATS_RU_PARTICIPLE, '');
        } else {
            so = rv.replace(STATS_RU_VERB, '');
            rv = so !== rv ? so : rv.replace(STATS_RU_NOUN, '');
        }
    } else {
        rv = so;
    }

    // Step 2: trailing и.
    rv = rv.replace(/и$/, '');
    // Step 3: derivational (ость / ост) within R2 ≈ rv here.
    if (STATS_RU_DERIVATIONAL.test(rv)) rv = rv.replace(STATS_RU_DERIVATIONAL, '');
    // Step 4: soft sign; else superlative + нн→н.
    so = rv.replace(/ь$/, '');
    if (so !== rv) {
        rv = so;
    } else {
        rv = rv.replace(STATS_RU_SUPERLATIVE, '').replace(/нн$/, 'н');
    }
    return head + rv;
}

// -----------------------------------------------------------------------------
// English Porter stemmer — the classic compact algorithm (Porter, 1980).
// -----------------------------------------------------------------------------
const STATS_EN_STEP2 = {
    ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize', bli: 'ble',
    alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous', ization: 'ize', ation: 'ate',
    ator: 'ate', alism: 'al', iveness: 'ive', fulness: 'ful', ousness: 'ous', aliti: 'al',
    iviti: 'ive', biliti: 'ble', logi: 'log',
};
const STATS_EN_STEP3 = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' };

function statsStemEn(word) {
    if (word.length < 3) return word;
    const c = '[^aeiou]', v = '[aeiouy]';
    const C = c + '[^aeiouy]*', V = v + '[aeiou]*';
    const mgr0 = new RegExp('^(' + C + ')?' + V + C);
    const mgr1 = new RegExp('^(' + C + ')?' + V + C + V + C);
    const meq1 = new RegExp('^(' + C + ')?' + V + C + '(' + V + ')?$');
    const s_v = new RegExp('^(' + C + ')?' + v);

    let w = word;
    // Step 1a.
    if (/(ss|i)es$/.test(w)) w = w.replace(/(ss|i)es$/, '$1');
    else if (/([^s])s$/.test(w)) w = w.replace(/([^s])s$/, '$1');
    // Step 1b.
    if (/eed$/.test(w)) { if (mgr0.test(w.replace(/eed$/, ''))) w = w.replace(/eed$/, 'ee'); }
    else if (/(ed|ing)$/.test(w)) {
        const stem = w.replace(/(ed|ing)$/, '');
        if (s_v.test(stem)) {
            w = stem;
            if (/(at|bl|iz)$/.test(w)) w += 'e';
            else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1);
            else if (meq1.test(w)) w += 'e';
        }
    }
    // Step 1c.
    if (/y$/.test(w)) { const stem = w.replace(/y$/, ''); if (s_v.test(stem)) w = stem + 'i'; }
    // Step 2.
    let m2 = w.match(/(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/);
    if (m2 && mgr0.test(w.slice(0, -m2[0].length))) w = w.slice(0, -m2[0].length) + STATS_EN_STEP2[m2[0]];
    // Step 3.
    let m3 = w.match(/(icate|ative|alize|iciti|ical|ful|ness)$/);
    if (m3 && mgr0.test(w.slice(0, -m3[0].length))) w = w.slice(0, -m3[0].length) + STATS_EN_STEP3[m3[0]];
    // Step 4.
    const m4 = w.match(/(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/);
    if (m4 && mgr1.test(w.slice(0, -m4[0].length))) w = w.slice(0, -m4[0].length);
    else if (/(s|t)ion$/.test(w) && mgr1.test(w.slice(0, -3))) w = w.slice(0, -3);
    // Step 5.
    if (/e$/.test(w)) {
        const stem = w.slice(0, -1);
        if (mgr1.test(stem) || (meq1.test(stem) && !/^([^aeiouy][^aeiouy]*)?[aeiouy][^aeiouwxy]$/.test(stem))) w = stem;
    }
    if (/ll$/.test(w) && mgr1.test(w)) w = w.slice(0, -1);
    return w;
}

/** Stems a lowercased token, dispatching by script (Cyrillic → ru, else → en). */
function statsStem(word) {
    return /[а-я]/.test(word) ? statsStemRu(word) : statsStemEn(word);
}

/**
 * Word-frequency cloud from a quote list: counts by stem, but returns the most
 * frequent surface form of each stem so the label reads naturally. Sorted by
 * count desc; ties broken alphabetically for stable output.
 * @param {Array} list   - quotes (uses q.text)
 * @param {number} topN  - max entries to return (default 14)
 * @returns {Array<{word:string,count:number}>}
 */
function statsWordCloud(list, topN) {
    topN = topN || 14;
    const stems = new Map(); // stem → { count, forms: Map<surface, count> }
    for (const q of list) {
        const tokens = statsTokenize(q && q.text);
        for (const raw of tokens) {
            if (raw.length < 3) continue;
            if (STATS_STOPWORDS.has(raw)) continue;
            const stem = statsStem(raw);
            if (!stem || stem.length < 2) continue;
            let e = stems.get(stem);
            if (!e) { e = { count: 0, forms: new Map() }; stems.set(stem, e); }
            e.count++;
            e.forms.set(raw, (e.forms.get(raw) || 0) + 1);
        }
    }

    const arr = [];
    stems.forEach(e => {
        let best = '', bestC = -1;
        e.forms.forEach((c, form) => {
            // Prefer the more frequent form; on a tie, the shorter (usually the lemma-ish) one.
            if (c > bestC || (c === bestC && form.length < best.length)) { bestC = c; best = form; }
        });
        arr.push({ word: best, count: e.count });
    });
    arr.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    return arr.slice(0, topN);
}

// -----------------------------------------------------------------------------
// Language complexity — a deliberately rough heuristic (NOT a validated readability
// index like Flesch). Blends three normalised factors, equally weighted:
//   • average word length (letters per word)
//   • average sentence length (words per sentence)
//   • share of long words (≥ 10 letters)
// Returns a 0–100 score (surfaced only as a 5-band label + gauge fill, never a number)
// plus the raw factors for the caption. null when there's no text to measure.
// -----------------------------------------------------------------------------
const STATS_COMPLEXITY_LONG_WORD = 10; // letters; a word this long counts as "long"

/** Linear normalise v from [lo, hi] into [0, 1], clamped. */
function statsNorm(v, lo, hi) {
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
}

function statsComplexity(list) {
    let words = 0, letters = 0, longWords = 0, sentences = 0;
    for (const q of list) {
        const text = (q && q.text) || '';
        if (!text.trim()) continue;
        const tokens = statsTokenize(text);
        words += tokens.length;
        for (const tok of tokens) {
            letters += tok.length;
            if (tok.length >= STATS_COMPLEXITY_LONG_WORD) longWords++;
        }
        // Sentences: run of terminators = one boundary; a text with none is still one sentence.
        const ends = (text.match(/[.!?…]+/g) || []).length;
        sentences += Math.max(1, ends);
    }
    if (words === 0) return null;

    const avgWordLen = letters / words;
    const avgSentenceLen = words / sentences;
    const longWordShare = longWords / words;

    // Ranges chosen so typical prose lands mid-scale; endpoints are "very simple" / "very dense".
    const score01 = (
        statsNorm(avgWordLen, 4.0, 7.5) +
        statsNorm(avgSentenceLen, 6, 22) +
        statsNorm(longWordShare, 0, 0.22)
    ) / 3;

    const score = Math.round(score01 * 100);
    return {
        score,
        band: Math.min(4, Math.floor(score / 20)), // 0..4
        avgWordLen,
        avgSentenceLen,
        longWordShare,
    };
}

// -----------------------------------------------------------------------------
// Duplicate / near-duplicate detection ("hygiene"). Finds quote pairs that are
// the same or nearly the same text. Similarity is measured over *stemmed content
// words* (stop-words dropped), which — unlike character trigrams — sees through
// re-wording and word order, so "you don't rise to your goals" and "we don't rise
// to goals" read as the same quote. Kinds:
//   • identical normalized text                → "exact"
//   • normalized text of one ⊆ the other, or   → "contained" (one extends the other)
//     stem-overlap ≥ STATS_DUP_CONTAINMENT       (pure Jaccard misses this)
//   • stem-Jaccard ≥ STATS_DUP_THRESHOLD        → "similar" (re-worded)
// Candidates come from a stem inverted index (not an O(n²) sweep). Pairs whose key
// is in `ignore` (the user's "not a duplicate" list) are dropped.
// -----------------------------------------------------------------------------
const STATS_DUP_THRESHOLD = 0.75;    // stemmed-word Jaccard for "similar"
const STATS_DUP_CONTAINMENT = 0.9;   // overlap coefficient for "one contains the other"
const STATS_DUP_MIN_LEN = 20;        // ignore very short texts (too noisy)
const STATS_DUP_MIN_TOKENS = 4;      // "similar"/overlap needs this many content words (else exact/substring only)
const STATS_DUP_COMMON_BUCKET = 400; // skip ultra-common stems when gathering candidates

/** Normalises text for comparison: lowercase, ё→е, strip punctuation, collapse whitespace. */
function statsNormalizeText(text) {
    return (text || '').toLowerCase().replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9 ]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

/** Set of stemmed content words (stop-words and sub-3-letter tokens removed). */
function statsContentStems(text) {
    const set = new Set();
    for (const raw of statsTokenize(text)) {
        if (raw.length < 3 || STATS_STOPWORDS.has(raw)) continue;
        const stem = statsStem(raw);
        if (stem && stem.length >= 2) set.add(stem);
    }
    return set;
}

/** Size of the intersection of two sets (iterates the smaller one). */
function statsIntersectSize(a, b) {
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    let n = 0;
    small.forEach(x => { if (large.has(x)) n++; });
    return n;
}

/** Stable unordered pair key from two quote ids. */
function statsDupKey(idA, idB) {
    return idA < idB ? idA + ':' + idB : idB + ':' + idA;
}

/**
 * @param {Array} list       - quotes (uses q.id, q.text, q.author)
 * @param {Set}   [ignore]   - pair keys (statsDupKey) the user marked "not a duplicate"
 * @param {number} [maxPairs]
 * @returns {{pairs:Array, pairCount:number, quoteCount:number}}
 */
function statsDuplicates(list, ignore, maxPairs) {
    maxPairs = maxPairs || 30;
    const items = [];
    for (const q of list) {
        if (q == null || q.id == null) continue;
        const norm = statsNormalizeText(q.text);
        if (norm.length < STATS_DUP_MIN_LEN) continue;
        items.push({ id: q.id, author: (q.author || ''), text: (q.text || ''), norm, stems: statsContentStems(q.text) });
    }

    // Stem inverted index → candidate pairs.
    const index = new Map();
    items.forEach((it, i) => it.stems.forEach(st => {
        let bucket = index.get(st);
        if (!bucket) { bucket = []; index.set(st, bucket); }
        bucket.push(i);
    }));

    const pairs = [];
    const seen = new Set();
    items.forEach((it, i) => {
        const cand = new Set();
        it.stems.forEach(st => {
            const bucket = index.get(st);
            if (bucket.length > STATS_DUP_COMMON_BUCKET) return; // perf guard on very common stems
            bucket.forEach(j => { if (j > i) cand.add(j); });
        });
        // Substring/exact can still hold even when stem-candidacy didn't fire, but a shared stem is a
        // precondition for any real overlap here, so gathering candidates from the index is enough.
        cand.forEach(j => {
            const other = items[j];
            const key = statsDupKey(it.id, other.id);
            if (seen.has(key)) return;
            seen.add(key);
            if (ignore && ignore.has(key)) return;

            const enoughTokens = it.stems.size >= STATS_DUP_MIN_TOKENS && other.stems.size >= STATS_DUP_MIN_TOKENS;
            const inter = statsIntersectSize(it.stems, other.stems);
            const jaccard = inter / (it.stems.size + other.stems.size - inter || 1);
            const overlap = inter / (Math.min(it.stems.size, other.stems.size) || 1);
            const substring = it.norm === other.norm ? false
                : (it.norm.includes(other.norm) || other.norm.includes(it.norm));

            // Order matters: textual containment is definitively "contained"; otherwise a high
            // Jaccard means "re-worded" (similar); a high overlap with low Jaccard means one text
            // carries extra content the other doesn't (contained).
            let kind = null, score = 0;
            if (it.norm === other.norm) { kind = 'exact'; score = 1; }
            else if (substring) { kind = 'contained'; score = overlap; }
            else if (enoughTokens && jaccard >= STATS_DUP_THRESHOLD) { kind = 'similar'; score = jaccard; }
            else if (enoughTokens && overlap >= STATS_DUP_CONTAINMENT) { kind = 'contained'; score = overlap; }
            if (!kind) return;

            pairs.push({
                a: { id: it.id, author: it.author, text: it.text },
                b: { id: other.id, author: other.author, text: other.text },
                kind,
                score,
            });
        });
    });

    // Strongest first; exact > contained > similar, then by score.
    const rank = { exact: 3, contained: 2, similar: 1 };
    pairs.sort((p, q) => (rank[q.kind] - rank[p.kind]) || (q.score - p.score));

    const involved = new Set();
    pairs.forEach(p => { involved.add(p.a.id); involved.add(p.b.id); });
    return { pairs: pairs.slice(0, maxPairs), pairCount: pairs.length, quoteCount: involved.size, quoteIds: [...involved] };
}
