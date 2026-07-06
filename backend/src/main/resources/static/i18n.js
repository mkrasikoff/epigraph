/**
 * i18n.js — Internationalization dictionary for Epigraph.
 *
 * Usage:
 *   t('key') — returns the string for the current language
 *   t('key', { n: 5 }) — returns the string with {n} replaced by 5
 *
 * To add a new language, duplicate the 'ru' block and translate every value.
 * To switch language at runtime, set window.__epigraphLang and call applyI18n().
 */

const TRANSLATIONS = {
    ru: {
        // ── Auth ──────────────────────────────────────────────────────────────
        authSubtitle:                   'Войдите, чтобы продолжить',
        authSubmitLogin:                'Войти',
        authSubmitRegister:             'Зарегистрироваться',
        authSwitchToLogin:              'Уже есть аккаунт?',
        authSwitchToRegister:           'Нет аккаунта?',
        authSwitchBtnLogin:             'Войти',
        authSwitchBtnRegister:          'Зарегистрироваться',
        authPlaceholderEmail:           'you@example.com',
        authPlaceholderPasswordLogin:   'Ваш пароль',
        authPlaceholderPasswordRegister:'Минимум 8 символов',
        authLoading:                    'Подождите...',
        authTagline:                    'Ваши цитаты. Каждый день.',
        authRegisterHeading:            'Создайте аккаунт',
        authRegisterSub:                'Это бесплатно. Навсегда.',
        authEmailLabel:                 'Email',
        authPasswordLabel:              'Пароль',
        authPasswordHint:               'Минимум 8 символов, хотя бы одна буква и одна цифра.',
        authDivider:                    'или',
        authGoogleButton:               'Войти через Google',
        authYandexButton:               'Войти через Яндекс',
        authUsernameLabel:              'Имя пользователя',
        authUsernamePlaceholder:        'ivan_petrov',

        // Auth validation errors ────────────────────────────────────────────────────────
        authErrorFillAllFields:         'Заполните все поля',
        authErrorInvalidEmail:          'Введите корректный email',
        authErrorInvalidEmailDot:       'Введите корректный email.',
        authErrorPasswordTooShort:      'Пароль должен содержать минимум 8 символов',
        authErrorPasswordTooLong:       'Пароль слишком длинный (максимум 128 символов)',
        authErrorPasswordNoLetter:      'Пароль должен содержать минимум одну букву',
        authErrorPasswordNoDigit:       'Пароль должен содержать минимум одну цифру',
        authErrorPasswordPattern:       'Минимум 8 символов, буква и цифра.',
        authErrorWrongCredentials:      'Неверный email или пароль',
        authGeoBlocked:                 'Вход через Google недоступен в вашем регионе',
        authGeoBlockedYandex:           'Вход через Яндекс доступен только из России',
        authErrorInvalidEmailServer:    'Некорректный email',
        authErrorConnection:            'Ошибка соединения',
        authErrorUsernameInvalid:       'Имя пользователя: 3–20 символов, латинские буквы, цифры и подчёркивание',

        // Auth Email Verification ────────────────────────────────────────────────────────
        verifyTitle:            'Подтвердите email',
        verifySubtitle:         'Мы отправили 6-значный код на {email}',
        verifyCodeLabel:        'Код из письма',
        verifySubmit:           'Подтвердить',
        verifyErrorInvalidCode: 'Неверный или истёкший код',
        verifyResendHint:       'Не пришло письмо?',
        verifyResendLink:       'Отправить повторно',
        verifyResendSuccess:    'Код отправлен повторно',
        verifyResendError:      'Не удалось отправить код',
        verifyBack:             'Назад',

        // ── Change password ───────────────────────────────────────────────────
        changePasswordTitle:              'Сменить пароль',
        changePasswordSettingsDesc:       'Установить или изменить пароль для входа по email.',
        changePasswordButton:             'Сменить пароль',
        changePasswordNew:                'Новый пароль',
        changePasswordConfirm:            'Подтвердите новый пароль',
        changePasswordNewPlaceholder:     'Минимум 8 символов',
        changePasswordConfirmPlaceholder: 'Повторите новый пароль',
        changePasswordSubmit:             'Сохранить',
        changePasswordSuccess:            'Пароль успешно изменён',
        changePasswordErrorMismatch:      'Пароли не совпадают',

        // ── Edit username modal ───────────────────────────────────────────────
        editUsernameTitle:                'Изменить имя пользователя',
        editUsernameLabel:                'Имя пользователя',
        editUsernamePlaceholder:          'ivan_petrov',
        editUsernameErrorRequired:        'Введите имя пользователя',
        editUsernameErrorLength:          'От 3 до 20 символов',
        editUsernameErrorChars:           'Только латинские буквы, цифры и подчёркивание',
        editUsernameErrorInvalid:         'Некорректное имя пользователя',
        editUsernameSuccess:              'Имя пользователя обновлено',

        // ── Avatar picker modal ────────────────────────────────────────────────
        avatarPickerSuccess:              'Иконка обновлена',
        avatarPickerError:                'Не удалось обновить иконку',

        // ── Avatar icon labels (keys mirror AVATAR_ICON_KEYS in avatars.js) ────
        avatarIconNeutral:                'Нейтральная',
        avatarIconBear:                   'Медведь',
        avatarIconCat:                    'Кот',
        avatarIconDog:                    'Собака',
        avatarIconHamster:                'Хомяк',
        avatarIconRabbit:                 'Кролик',
        avatarIconFox:                    'Лиса',
        avatarIconOwl:                    'Сова',
        avatarIconElephant:               'Слон',
        avatarIconMouse:                  'Мышь',
        avatarIconDuck:                   'Утка',
        avatarIconSeal:                   'Тюлень',

        // ── Forgot password ──────────────────────────────────────────────────────
        forgotPasswordLink:               'Забыли пароль?',
        forgotPasswordTitle:              'Восстановление пароля',
        forgotPasswordDesc:               'Введите email — мы пришлём ссылку для смены пароля.',
        forgotPasswordEmailLabel:         'Email',
        forgotPasswordSubmit:             'Отправить ссылку',
        forgotPasswordSuccessHint:        'Если аккаунт с этим email существует, письмо придёт в течение минуты.',
        forgotPasswordBack:               'Назад к входу',

        // ── Navigation ────────────────────────────────────────────────────────
        navToday:                       'На сегодня',
        navMyQuotes:                    'Мои цитаты',
        navAdd:                         'Добавить',
        navSettings:                    'Настройки',
        ariaToggleTheme:                'Переключить тему',
        ariaLogout:                     'Выйти из аккаунта',
        ariaBannerClose:                'Закрыть',

        // ── QOD (Quote of the Day) ────────────────────────────────────────────
        qodEmptyText:                   'Добавьте первую цитату в разделе «Добавить»',
        qodProgress:                    'Цитата {current} из {total}',
        qodRandomBtn:                   'Случайная',
        qodCopyBtn:                     'Копировать',

        // ── Quote list ────────────────────────────────────────────────────────
        ariaFavorite:                   'В избранное',
        ariaCopy:                       'Копировать',
        ariaEdit:                       'Редактировать',
        ariaDelete:                     'Удалить',
        ariaSearch:                     'Поиск',
        searchPlaceholder:              'Поиск по цитатам...',
        listHeading:                    'Мои цитаты',
        filterAll:                      'Все',
        filterFav:                      '⭐ Избранные',
        expandHintOpen:                 'Нажмите, чтобы читать полностью ↓',
        expandHintClose:                'Свернуть ↑',
        emptyStateNoQuotes:             'Пока нет цитат',
        emptyStateNoResults:            'Ничего не найдено',
        emptyStateNoQuotesHint:         'Перейдите в раздел «Добавить»',
        emptyStateNoResultsHint:        'Попробуйте другой запрос',
        statsTotal:                     '{total} цитат всего',
        statsFavorites:                 '{count} в избранном',

        // ── Sort ──────────────────────────────────────────────────────────────
        sortDateDesc:                   'Сначала новые',
        sortDateAsc:                    'Сначала старые',
        sortAuthorAsc:                  'По автору (А–Я)',
        sortAuthorDesc:                 'По автору (Я–А)',

        // ── Add quote form ────────────────────────────────────────────────────
        placeholderQuoteText:           'Введите текст цитаты…',
        placeholderAuthor:              'Имя автора',
        placeholderSource:              'Книга, фильм, речь…',
        addTitle:                       'Добавить цитату',
        addSubtitle:                    'Добавляйте цитаты вручную, импортируйте через JSON файл или перенесите из Яндекс.Книг.',
        addLabelText:                   'Текст цитаты',
        addLabelAuthor:                 'Автор',
        addLabelSource:                 'Источник',
        addLabelTags:                   'Теги',
        addRequired:                    '(обязательно)',
        addOptional:                    '(необязательно)',
        addSubmitBtn:                   'Добавить цитату',
        addClearBtn:                    'Очистить',
        addImportTitle:                 'Импорт цитат',
        addImportTabJson:               'Файл JSON',
        addImportTabYandex:             'Яндекс.Книги',
        addImportDropLabel:             'Выберите файл или перетащите сюда',
        addJsonExampleLabel:            'Пример структуры JSON:',
        placeholderTagInput:            'тег…',
        tagAddButtonLabel:              'тег',
        ariaTagRemove:                  'Убрать тег',
        ariaTagAdd:                     'Добавить тег',
        toastQuoteTextRequired:         'Текст цитаты обязателен',
        toastQuoteAdded:                'Цитата добавлена!',
        toastQuoteSaveError:            'Ошибка сохранения',

        // ── Edit quote modal ──────────────────────────────────────────────────
        editModalTitle:                 'Редактировать цитату',
        placeholderEditQuoteText:       'Текст цитаты...',
        placeholderEditAuthor:          'Имя автора',
        placeholderEditSource:          'Книга, фильм, речь...',
        editSaveButton:                 'Сохранить',
        editCancelButton:               'Отмена',
        toastQuoteUpdated:              'Цитата обновлена',
        toastQuoteUpdateError:          'Ошибка сохранения',
        toastConnectionError:           'Ошибка соединения',

        // ── Delete quote modal ────────────────────────────────────────────────
        deleteModalTitle:               'Удалить цитату?',
        deleteModalCannotUndo:          'Это действие нельзя отменить.',
        deleteButton:                   'Удалить',
        cancelButton:                   'Отмена',
        toastQuoteDeleted:              'Цитата удалена',
        toastDeleteError:               'Ошибка удаления',

        // ── Delete all quotes modal ───────────────────────────────────────────
        deleteAllModalTitle:            'Удалить все ваши цитаты?',
        deleteAllModalBody:             'Вы собираетесь удалить все {count} цитат. Это действие нельзя отменить.',
        deleteAllButton:                'Удалить всё',
        toastAllQuotesDeleted:          'Все ваши цитаты удалены',

        // ── Delete account modal ──────────────────────────────────────────────
        deleteAccountTitle:             'Удалить аккаунт?',
        deleteAccountBody:              'Это действие необратимо. Все ваши цитаты и данные будут удалены навсегда.',
        deleteAccountButton:            'Да, удалить',
        deleteAccountToastError:        'Не удалось удалить аккаунт. Попробуйте позже.',

        // ── Delete confirm phrases ────────────────────────────────────────────
        deleteAllConfirmPhrase:         'Я хочу удалить все цитаты',
        deleteAllConfirmPlaceholder:    'Введите фразу для подтверждения',
        deleteAccountConfirmPhrase:     'Я хочу удалить свой аккаунт',
        deleteAccountConfirmPlaceholder:'Введите фразу для подтверждения',
        deleteConfirmHint:              'Для подтверждения введите:',

        // ── Import / Export ───────────────────────────────────────────────────
        importExpectedArray:            'Ожидается массив',
        importNoValidItems:             'В файле не найдено ни одной цитаты с текстом',
        toastImportError:               'Ошибка импорта: {message}',
        toastCopied:                    'Скопировано!',
        toastCopyError:                 'Ошибка копирования',
        copiedButtonLabel:              'Скопировано',

        // ── Import preview modal ──────────────────────────────────────────────
        importPreviewTitle:             'Предпросмотр импорта',
        importPreviewSummary:           'Найдено {count} {word} в загруженном файле. Проверьте несколько примеров ниже и подтвердите импорт.',
        importPreviewMore:              'и ещё {count} {word}',
        importPreviewConfirm:           'Импортировать {count} {word}',
        importProgressLabel:            'Импортируем: {current} из {total}',
        importStopBtn:                  'Остановить',
        closeButton:                    'Закрыть',
        importSummaryDone:              'Готово! Добавлено {count} {word}.',
        importSummaryStopped:           'Импорт остановлен. Успело добавиться {count} из {total} {word}.',
        importSummaryError:             'Импорт прерван из-за ошибки соединения. Успело добавиться {count} из {total} {word}.',
        importSummarySkipped:           'Пропущено {count} {word} — не прошли проверку (слишком длинный текст, автор или источник).',

        // ── Import from Yandex Books ──────────────────────────────────────────
        importYandexBenefit:            'Стоит использовать, если в Яндекс.Книгах накопилось больше 20–30 цитат — переносить их вручную одну за другой будет намного дольше. Если цитат всего пара штук, проще добавить их сразу в форме выше.',
        importYandexStep1Prefix:        'Открой ',
        importYandexStep1Suffix:        ', зайди в свой профиль, залогинившись.',
        importYandexStep2:              'Открой консоль браузера (F12 → Console), вставь скрипт и нажми Enter.',
        importYandexDesktopOnly:        'Доступно только в браузере на компьютере — на телефоне нет инструментов разработчика, которые нужны для этого способа.',
        importYandexStep3Prefix:        'Скрипт скачает файл ',
        importYandexStep3Suffix:        ' — загрузи его ниже, как обычный JSON.',
        importYandexCopyBtn:            'Скопировать скрипт',
        importYandexUploadLabel:        'Загрузить скачанный файл',
        importYandexFaqSummary:         'Это безопасно? Что такое консоль?',
        importYandexFaqQ1:              'Что такое консоль браузера?',
        importYandexFaqA1:              'Панель разработчика, встроенная в каждый браузер. Она умеет выполнять код прямо на открытой странице — но не имеет доступа к твоим файлам, паролям или другим сайтам.',
        importYandexFaqQ2:              'Безопасно ли вставлять туда код?',
        importYandexFaqA2:              'Скрипт работает только в твоём браузере и обращается только к books.yandex.ru под твоей же сессией. Epigraph не получает и не хранит ни пароль, ни куки твоего аккаунта Яндекс — только файл с цитатами, который ты сам сюда загружаешь.',
        importYandexFaqQ3:              'Браузер показал предупреждение при вставке — это нормально?',
        importYandexFaqA3:              'Да, это стандартная защита от случайной вставки чужого вредоносного кода. Раз ты скопировал скрипт именно с этой страницы, всё в порядке — просто подтверди вставку. Но не вставляй в консоль код из источников, которым не доверяешь.',
        importYandexFaqQ4:              'F12 не открывает панель — что делать?',
        importYandexFaqA4:              'Кликни правой кнопкой мыши на странице и выбери «Просмотреть код» / «Inspect». На Mac можно также нажать Cmd+Option+I, на Windows — Ctrl+Shift+I. В Safari сначала включи меню «Разработка» в настройках браузера.',
        importYandexFaqQ5:              'Сколько это занимает?',
        importYandexFaqA5:              'Если книг в библиотеке много (сотни), скрипт может выполняться минуту-две — он обращается к каждой книге по отдельности с небольшой паузой между запросами, чтобы не перегружать сервер Яндекса. Дождись сообщения «ГОТОВО» в консоли, прежде чем загружать скачанный файл.',

        // ── Settings page (static markup) ───────────────────────────────────
        settingsTitle:                  'Настройки',
        settingsAccountTitle:           'Аккаунт',
        settingsAccountEditAria:        'Изменить имя пользователя',
        settingsAccountAvatarAria:      'Изменить иконку',
        settingsLogoutBtn:              'Выйти',
        settingsNotifTitle:             'Уведомления',
        settingsNotifQodTitle:          'Цитата дня',
        settingsNotifQodDesc:           'Push-уведомление с цитатой. Работает даже с закрытой вкладкой.',
        settingsNotifFreqTitle:         'Частота',
        settingsNotifFreqDesc:          'Как часто отправлять уведомление.',
        settingsDataTitle:              'Данные',
        settingsExportTitle:            'Экспорт в JSON',
        settingsExportDesc:             'Скачайте все ваши цитаты для резервного копирования или переноса.',
        settingsExportBtn:              'Экспорт',
        settingsCopyAllTitle:           'Копировать всё как текст',
        settingsCopyAllDesc:            'Скопируйте все ваши цитаты в буфер обмена в текстовом формате.',
        settingsCopyAllBtn:             'Копировать',
        settingsImportTitle:            'Импорт из JSON',
        settingsImportDesc:             'Загрузите файл со списком цитат для добавления в коллекцию.',
        settingsImportBtn:              'Импорт',
        settingsDangerTitle:            'Опасная зона',
        settingsDeleteAllTitle:         'Удалить все ваши цитаты',
        settingsDeleteAllDesc:          'Безвозвратное удаление всех ваших цитат из приложения.',
        settingsDeleteAccountTitle:     'Удалить аккаунт',
        settingsDeleteAccountDesc:      'Безвозвратное удаление аккаунта и всех ваших данных.',
        settingsDeleteAccountBtn:       'Удалить аккаунт',
        settingsAboutTitle:             'О приложении',
        settingsAboutDesc:              'Личная коллекция цитат — храните, читайте и делитесь тем, что вас вдохновляет.',
        settingsStorageTitle:           'Хранение данных',
        settingsStorageDesc:            'Ваши цитаты хранятся в облаке и доступны с любого устройства. Используйте экспорт для резервных копий.',
        settingsSourceTitle:            'Исходный код',
        settingsSourceDesc:             'Проект с открытым исходным кодом на GitHub.',
        ariaNotificationsToggle:        'Уведомления о цитате дня',

        // ── Notifications ─────────────────────────────────────────────────────
        toastPushNotSupported:          'Ваш браузер не поддерживает push-уведомления',
        toastPushAskPermission:         'Сейчас браузер попросит разрешение — нажмите «Разрешить»',
        toastPushDenied:                'Разрешите уведомления в настройках браузера',
        toastPushUnavailable:           'Push-уведомления временно недоступны',
        toastPushEnabled:               'Уведомления включены',
        toastPushSubscribeError:        'Ошибка подписки на уведомления',
        toastPushDisabled:              'Уведомления отключены',
        toastPushUnsubscribeError:      'Ошибка отключения уведомлений',
        toastPushLoginRequired:         'Войдите в аккаунт для настройки уведомлений',

        // ── Plural forms ──────────────────────────────────────────────────────────
        pluralQuote1:                   'цитата',
        pluralQuote2:                   'цитаты',
        pluralQuote5:                   'цитат',
        statsSummary:                   '{total} {word} · {favorites} в избранном',

        // ── Favorite button tooltip ───────────────────────────────────────────────
        favActive:                      'В избранном',
        favInactive:                    'В избранное',

        // ── Notification interval labels ──────────────────────────────────────────
        notifInterval6h:                'Каждые 6 часов',
        notifInterval12h:               'Каждые 12 часов',
        notifInterval24h:               'Раз в день',

        // ── General ───────────────────────────────────────────────────────────
        toastLoginRequired:             'Войдите в аккаунт для доступа к этому разделу',
        toastError:                     'Ошибка',
    }
};

/** Currently active language code. */
let currentLanguage = localStorage.getItem('epigraph_lang') || 'ru';

/**
 * Picks the grammatically correct Russian plural form for a count.
 * @param {number} n - The count.
 * @param {string} one - Form for 1, 21, 31... (e.g. "цитата").
 * @param {string} few - Form for 2-4, 22-24... (e.g. "цитаты").
 * @param {string} many - Form for 0, 5-20, 25-30... (e.g. "цитат").
 * @returns {string}
 */
function pluralRu(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

/**
 * Returns the correctly declined word for "quote(s)" for the given count.
 * @param {number} n
 * @returns {string}
 */
function quoteCountWord(n) {
    return pluralRu(n, 'цитата', 'цитаты', 'цитат');
}

/**
 * Returns the translated string for the given key in the current language.
 * Supports simple variable interpolation: t('key', { count: 5 }) replaces {count} with 5.
 * Falls back to the key itself if no translation is found.
 *
 * @param {string} key - Translation key from TRANSLATIONS[lang].
 * @param {Object} [variables] - Optional map of {placeholder: value} to interpolate.
 * @returns {string}
 */
function t(key, variables) {
    const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS['ru'];
    let string = dict[key];

    if (string === undefined) {
        console.warn(`[i18n] Missing translation key: "${key}" for language "${currentLanguage}"`);
        return key;
    }

    if (variables) {
        Object.entries(variables).forEach(([placeholder, value]) => {
            string = string.replaceAll(`{${placeholder}}`, value);
        });
    }

    return string;
}


/**
 * Walks the DOM and applies translations to every element carrying an i18n
 * attribute. Runs once on startup and again whenever the language changes.
 *
 * Supported attributes:
 *   data-i18n="key"             → el.textContent
 *   data-i18n-placeholder="key" → el.placeholder
 *   data-i18n-aria="key"        → el.setAttribute('aria-label', ...)
 *   data-i18n-title="key"       → el.setAttribute('title', ...)
 *
 * @param {ParentNode} [root=document] - Subtree to scan (defaults to the whole document).
 */
function applyI18n(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
        el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.dataset.i18nTitle));
    });
}
