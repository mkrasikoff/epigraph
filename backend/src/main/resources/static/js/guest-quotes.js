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
            text: 'Мы чаще страдаем в воображении, чем наяву.',
            author: 'Сенека',
            source: 'Нравственные письма к Луцилию',
            fav: false,
            tags: []
        },
        {
            id: -2,
            text: 'Людей мучают не вещи, а представления о них.',
            author: 'Эпиктет',
            source: 'Энхиридион',
            fav: false,
            tags: []
        },
        {
            id: -3,
            text: 'Потеря — это не что иное, как изменение, а изменение — радость природы.',
            author: 'Марк Аврелий',
            source: 'Размышления',
            fav: false,
            tags: ['стоицизм', 'перемены']
        },
        {
            id: -4,
            text: 'В одну и ту же реку нельзя войти дважды.',
            author: 'Гераклит',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -5,
            text: 'Единственное благо — знание, единственное зло — невежество.',
            author: 'Сократ',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -6,
            text: 'Красота спасёт мир.',
            author: 'Фёдор Достоевский',
            source: '«Идиот»',
            fav: false,
            tags: ['красота', 'надежда']
        },
        {
            id: -7,
            text: 'Не порти того, что имеешь, желанием того, чего не имеешь.',
            author: 'Эпикур',
            source: 'Ватиканское собрание',
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
            tags: ['юмор', 'жизнь']
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
            text: 'Две вещи наполняют душу всё новым удивлением — звёздное небо надо мной и нравственный закон во мне.',
            author: 'Иммануил Кант',
            source: 'Критика практического разума',
            fav: false,
            tags: []
        },
        {
            id: -12,
            text: 'Человек — мера всех вещей.',
            author: 'Протагор',
            source: '',
            fav: false,
            tags: ['философия', 'человек']
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
            tags: ['мудрость', 'знание']
        },
        {
            id: -16,
            text: 'У сердца свои законы, которых разум не знает.',
            author: 'Блез Паскаль',
            source: '«Мысли»',
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
            tags: ['труд', 'пословица']
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
            text: 'Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему.',
            author: 'Лев Толстой',
            source: '«Анна Каренина»',
            fav: false,
            tags: []
        },
        {
            id: -21,
            text: 'Величайшее в мире — уметь принадлежать себе.',
            author: 'Мишель Монтень',
            source: '«Опыты»',
            fav: false,
            tags: ['свобода', 'мудрость']
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
            tags: ['время', 'жизнь']
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
            text: 'We suffer more often in imagination than in reality.',
            author: 'Seneca',
            source: 'Letters to Lucilius',
            fav: false,
            tags: []
        },
        {
            id: -2,
            text: 'Men are disturbed not by things, but by their opinions about them.',
            author: 'Epictetus',
            source: 'Enchiridion',
            fav: false,
            tags: []
        },
        {
            id: -3,
            text: "Loss is nothing else but change, and change is Nature's delight.",
            author: 'Marcus Aurelius',
            source: 'Meditations',
            fav: false,
            tags: ['stoicism', 'change']
        },
        {
            id: -4,
            text: 'You cannot step into the same river twice.',
            author: 'Heraclitus',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -5,
            text: 'The only good is knowledge, and the only evil is ignorance.',
            author: 'Socrates',
            source: '',
            fav: false,
            tags: []
        },
        {
            id: -6,
            text: 'Beauty will save the world.',
            author: 'Fyodor Dostoevsky',
            source: 'The Idiot',
            fav: false,
            tags: ['beauty', 'hope']
        },
        {
            id: -7,
            text: 'Do not spoil what you have by desiring what you have not.',
            author: 'Epicurus',
            source: 'Vatican Sayings',
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
            tags: ['humor', 'life']
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
            text: 'Two things fill the mind with ever new wonder — the starry heavens above me and the moral law within me.',
            author: 'Immanuel Kant',
            source: 'Critique of Practical Reason',
            fav: false,
            tags: []
        },
        {
            id: -12,
            text: 'Man is the measure of all things.',
            author: 'Protagoras',
            source: '',
            fav: false,
            tags: ['philosophy', 'man']
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
            tags: ['wisdom', 'knowledge']
        },
        {
            id: -16,
            text: 'The heart has its reasons which reason knows nothing of.',
            author: 'Blaise Pascal',
            source: 'Pensées',
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
            tags: ['work', 'proverb']
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
            text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
            author: 'Leo Tolstoy',
            source: 'Anna Karenina',
            fav: false,
            tags: []
        },
        {
            id: -21,
            text: 'The greatest thing in the world is to know how to belong to oneself.',
            author: 'Michel de Montaigne',
            source: 'Essays',
            fav: false,
            tags: ['freedom', 'wisdom']
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
            tags: ['time', 'life']
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
