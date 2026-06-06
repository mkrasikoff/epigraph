/**
 * guest-quotes.js — Preset quote collection shown to unauthenticated (guest) users in Epigraph.
 *
 * Provides a fixed, read-only set of quotes (negative IDs) used as the Quote-of-the-Day
 * source when no user is logged in.
 *
 * Depends on:
 * - (none) — pure data module.
 *
 * Provides (globals):
 * - GUEST_QUOTES {Array} — array of preset quote objects, consumed in quotes.js
 */

const GUEST_QUOTES = [
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
        text: 'Будь собой — остальные роли уже заняты.',
        author: 'Оскар Уайльд',
        source: '',
        fav: false,
        tags: []
    },
    {
        id: -9,
        text: 'Два самых важных дня в твоей жизни — день, когда ты родился, и день, когда ты понял зачем.',
        author: 'Марк Твен',
        source: '',
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
        author: 'Аристотель',
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
        author: 'Конфуций',
        source: '',
        fav: false,
        tags: []
    },
    {
        id: -22,
        text: 'Всё гениальное просто.',
        author: 'Леонардо да Винчи',
        source: '',
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
        author: 'Конфуций',
        source: '',
        fav: false,
        tags: []
    },
];
