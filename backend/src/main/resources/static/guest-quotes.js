/**
 * guest-quotes.js — Preset quote collection shown to unauthenticated (guest) users in Epigraph.
 *
 * Provides a fixed, read-only set of quotes (negative IDs) used as the Quote-of-the-Day
 * source when no user is logged in. Kept in ru/en pairs (same order, same ids) so switching
 * language mid-session can keep showing "the same" quote via its index — see getGuestQuotes().
 *
 * Depends on:
 * - currentLanguage {string} — defined in i18n.js
 *
 * Provides (globals):
 * - GUEST_QUOTES {Object} — { ru: Array, en: Array } of preset quote objects
 * - getGuestQuotes() {fn} — returns the preset quote array for the current language
 */

const GUEST_QUOTES = {
    ru: [
        {
            id: -1,
            text: 'Счастье зависит от нас самих.',
            author: 'Аристотель',
            source: 'Никомахова этика',
            fav: false,
            tags: []
        },
        {
            id: -2,
            text: 'Не важно, как медленно ты идёшь, главное — не останавливаться.',
            author: 'Конфуций',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -3,
            text: 'Потеря — это не что иное, как изменение, а изменение — радость природы.',
            author: 'Марк Аврелий',
            source: 'Размышления',
            fav: false,
            tags: []
        },
        {
            id: -4,
            text: 'Познай самого себя.',
            author: 'Сократ',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -5,
            text: 'Единственное благо — знание, единственное зло — невежество.',
            author: 'Диоген Лаэртский',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -6,
            text: 'Жизнь — это то, что происходит, пока ты строишь другие планы.',
            author: 'Джон Леннон',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -7,
            text: 'В конце концов, важны не годы жизни, а жизнь в годах.',
            author: 'Авраам Линкольн',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -8,
            text: 'Мы все в канаве, но некоторые из нас смотрят на звёзды.',
            author: 'Оскар Уайльд',
            source: '«Веер леди Уиндермир»',
            fav: false,
            tags: []
        },
        {
            id: -9,
            text: 'Морщины должны лишь напоминать о том, где сияли улыбки.',
            author: 'Марк Твен',
            source: '«По экватору»',
            fav: false,
            tags: []
        },
        {
            id: -10,
            text: 'Не бойся медленно двигаться, бойся стоять на месте.',
            author: 'Китайская пословица',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -11,
            text: 'Всё, что я знаю — это то, что я ничего не знаю.',
            author: 'Сократ',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -12,
            text: 'Человек — мера всех вещей.',
            author: 'Протагор',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -13,
            text: 'Смелость — это не отсутствие страха, а решение, что что-то важнее страха.',
            author: 'Амброз Редмун',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -14,
            text: 'Тот, кто знает — не говорит. Тот, кто говорит — не знает.',
            author: 'Лао-цзы',
            source: 'Дао Дэ Цзин',
            fav: false,
            tags: []
        },
        {
            id: -15,
            text: 'Мудрец не тот, кто знает многое, а тот, кто знает нужное.',
            author: 'Эсхил',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -16,
            text: 'Начало — половина всего.',
            author: 'Аристотель',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -17,
            text: 'Сомнение — начало мудрости.',
            author: 'Рене Декарт',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -18,
            text: 'Без труда не выловишь и рыбку из пруда.',
            author: 'Русская пословица',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -19,
            text: 'Самый длинный путь начинается с первого шага.',
            author: 'Лао-цзы',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -20,
            text: 'Когда дует ветер перемен, одни строят стены, другие — ветряные мельницы.',
            author: 'Китайская пословица',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -21,
            text: 'Лучше зажечь одну свечу, чем проклинать темноту.',
            author: 'Китайская пословица',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -22,
            text: 'Железо ржавеет без использования, вода портится или замерзает на холоде — так же и ум чахнет без дела.',
            author: 'Леонардо да Винчи',
            source: '«Дневники»',
            fav: false,
            tags: []
        },
        {
            id: -23,
            text: 'Не откладывай на завтра то, что можно сделать сегодня.',
            author: 'Бенджамин Франклин',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -24,
            text: 'Твоё время ограничено, не трать его на чужую жизнь.',
            author: 'Стив Джобс',
            source: 'Речь в Стэнфорде',
            fav: false,
            tags: []
        },
        {
            id: -25,
            text: 'Падать — не страшно. Страшно — не подниматься.',
            author: 'Оливер Голдсмит',
            source: '',
            fav: false,
            tags: []
        },
    ],

    en: [
        {
            id: -1,
            text: 'Happiness depends upon ourselves.',
            author: 'Aristotle',
            source: 'Nicomachean Ethics',
            fav: false,
            tags: []
        },
        {
            id: -2,
            text: 'It does not matter how slowly you go as long as you do not stop.',
            author: 'Confucius',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -3,
            text: "Loss is nothing else but change, and change is Nature's delight.",
            author: 'Marcus Aurelius',
            source: 'Meditations',
            fav: false,
            tags: []
        },
        {
            id: -4,
            text: 'Know thyself.',
            author: 'Socrates',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -5,
            text: 'The only good is knowledge, and the only evil is ignorance.',
            author: 'Diogenes Laërtius',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -6,
            text: "Life is what happens to you while you're busy making other plans.",
            author: 'John Lennon',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -7,
            text: "In the end, it's not the years in your life that count. It's the life in your years.",
            author: 'Abraham Lincoln',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -8,
            text: 'We are all in the gutter, but some of us are looking at the stars.',
            author: 'Oscar Wilde',
            source: "Lady Windermere's Fan",
            fav: false,
            tags: []
        },
        {
            id: -9,
            text: 'Wrinkles should merely indicate where the smiles have been.',
            author: 'Mark Twain',
            source: 'Following the Equator',
            fav: false,
            tags: []
        },
        {
            id: -10,
            text: "Don't be afraid of going slowly, be afraid only of standing still.",
            author: 'Chinese proverb',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -11,
            text: 'I know that I know nothing.',
            author: 'Socrates',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -12,
            text: 'Man is the measure of all things.',
            author: 'Protagoras',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -13,
            text: 'Courage is not the absence of fear, but rather the judgment that something else is more important than fear.',
            author: 'Ambrose Redmoon',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -14,
            text: 'Those who know do not speak. Those who speak do not know.',
            author: 'Lao Tzu',
            source: 'Tao Te Ching',
            fav: false,
            tags: []
        },
        {
            id: -15,
            text: 'The wise man is not the one who knows many things, but the one who knows what is useful.',
            author: 'Aeschylus',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -16,
            text: 'Well begun is half done.',
            author: 'Aristotle',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -17,
            text: 'Doubt is the beginning of wisdom.',
            author: 'René Descartes',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -18,
            text: "You won't pull a fish out of a pond without effort.",
            author: 'Russian proverb',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -19,
            text: 'A journey of a thousand miles begins with a single step.',
            author: 'Lao Tzu',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -20,
            text: 'When the winds of change blow, some people build walls and others build windmills.',
            author: 'Chinese proverb',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -21,
            text: 'Better to light a candle than to curse the darkness.',
            author: 'Chinese proverb',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -22,
            text: 'Just as iron rusts unless it is used, and water putrefies or, in cold, turns to ice, so our intellect spoils unless it is kept in use.',
            author: 'Leonardo da Vinci',
            source: 'Notebooks',
            fav: false,
            tags: []
        },
        {
            id: -23,
            text: 'Never put off till tomorrow what you can do today.',
            author: 'Benjamin Franklin',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -24,
            text: "Your time is limited, so don't waste it living someone else's life.",
            author: 'Steve Jobs',
            source: 'Stanford Commencement Speech',
            fav: false,
            tags: []
        },
        {
            id: -25,
            text: 'Our greatest glory is not in never falling, but in rising every time we fall.',
            author: 'Oliver Goldsmith',
            source: '',
            fav: false,
            tags: []
        },
    ],
};

/**
 * Returns the preset guest quote array for the current UI language.
 * @returns {Array}
 */
function getGuestQuotes() {
    return GUEST_QUOTES[currentLanguage] || GUEST_QUOTES.ru;
}
