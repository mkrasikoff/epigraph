/**
 * i18n.js — Internationalization dictionary for Epigraph.
 *
 * Usage:
 *   t('key') — returns the string for the current language
 *   t('key', { n: 5 }) — returns the string with {n} replaced by 5
 *
 * To add a new language, duplicate the 'ru' block and translate every value.
 * To switch language at runtime, call setLanguage('en' | 'ru').
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
        authPlaceholderPasswordRegister:'••••••••',
        authLoading:                    'Подождите...',
        authTagline:                    'Ваши цитаты. Каждый день.',
        authRegisterQuote1Text:         'Не важно, как медленно ты идёшь, главное — не останавливаться.',
        authRegisterQuote1Author:       '— Конфуций',
        authRegisterQuote2Text:         'Жизнь — это то, что происходит, пока ты строишь другие планы.',
        authRegisterQuote2Author:       '— Джон Леннон',
        authRegisterQuote3Text:         'Начало — это половина всего.',
        authRegisterQuote3Author:       '— Аристотель',
        authRegisterHeading:            'Создайте аккаунт',
        authRegisterSub:                'Это бесплатно. Навсегда.',
        authEmailLabel:                 'Email',
        authPasswordLabel:              'Пароль',
        authPasswordHint:               'Минимум 8 символов, хотя бы одна буква и одна цифра.',
        authDivider:                    'или',
        authGoogleButton:               'Войти через Google',
        authYandexButton:               'Войти через Яндекс',
        authUsernameLabel:              'Имя пользователя',
        authUsernamePlaceholder:        'chitatel_42',

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

        // ── Profile setup modal (shown right after email verification) ─────────
        profileSetupTitle:      'Настройте профиль',
        profileSetupDesc:       'Выберите значок и имя пользователя — это только для вас внутри приложения, реальное имя указывать не обязательно. Изменить можно в любой момент в Настройках.',
        profileSetupSkip:       'Пропустить',

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
        editUsernamePlaceholder:          'chitatel_42',
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
        ariaSwitchToLightTheme:         'Переключить на светлую тему',
        ariaSwitchToDarkTheme:          'Переключить на тёмную тему',
        ariaToggleLanguage:             'Переключить язык',
        ariaLogout:                     'Выйти из аккаунта',
        ariaBannerClose:                'Закрыть',

        // ── QOD (Quote of the Day) ────────────────────────────────────────────
        qodEmptyText:                   'Добавьте первую цитату в разделе «Добавить»',
        qodProgress:                    'Цитата {current} из {total}',
        qodRandomBtn:                   'Случайная',
        qodCopyBtn:                     'Копировать',
        toastNoQuotesYet:               'Сначала добавьте хотя бы одну цитату',

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
        listShowMore:                   'Показать ещё ({remaining})',

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
        importJsonHint:                 'Загрузите файл формата <code class="inline-code">.json</code> со списком цитат.',
        importJsonFieldsHint:           'Формат: массив объектов с полями <code>text</code>, <code>author</code>, <code>source</code>',
        addJsonExampleLabel:            'Пример структуры JSON:',
        addJsonExampleContent:          '[\n  {\n    "text": "Текст цитаты",\n    "author": "Имя автора",\n    "source": "Название книги"\n  }\n]',
        placeholderTagInput:            'тег…',
        tagAddButtonLabel:              'тег',
        ariaTagRemove:                  'Убрать тег',
        ariaTagAdd:                     'Добавить тег',
        toastQuoteTextRequired:         'Текст цитаты обязателен',
        toastQuoteAdded:                'Цитата добавлена!',
        toastQuoteSaveError:            'Ошибка сохранения',
        toastQuoteLimitReached:         'Достигнут лимит в {limit} цитат. Удалите часть цитат, чтобы добавить новые.',
        toastValidationError:           'Ошибка валидации',

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
        importDownloadRejectedBtn:      'Скачать JSON с этими цитатами',

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
        settingsLanguageTitle:          'Язык интерфейса',
        settingsLanguageDesc:           'Переключить язык интерфейса приложения.',
        settingsThemeTitle:             'Тема оформления',
        settingsThemeDesc:              'Выберите оформление приложения. Светлый и тёмный режим переключаются отдельно.',
        ariaChooseThemeStyle:           'Выбрать тему оформления',
        themeStyleClassic:              'Классика',
        themeStyleForest:               'Лес',
        themeStyleCosmos:               'Космос',
        themeStyleOcean:                'Океан',
        themeStyleSunset:               'Закат',

        // ── Achievements (TASK-122) ──────────────────────────────────────────
        settingsAchievementsTitle:      'Достижения',
        settingsAchievementsDesc:       'Прогресс и награды за использование приложения.',
        ariaOpenAchievements:           'Открыть достижения',
        achievementsOpenBtn:            'Открыть',
        achievementsSummary:            '{unlocked} из {total} получено',
        achievementsThemesSection:      'Темы',
        achievementsBadgesSection:      'Бейджи',
        achievementsNearestThemesSection: 'Ближайшие достижения',
        achievementsCurrentBadge:       'Текущий бейдж',
        achievementsCurrentBadgeEmpty:  'Ещё не получен',
        achievementsNextBadge:          'Следующий',
        achievementsShowAllBtn:         'Все достижения ({total}) →',
        achievementsBackBtn:            '← Ближайшие',
        achievementsApplyThemeBtn:      'Применить тему «{theme}»',
        achievementsThemeAppliedToast:  'Тема применена',
        achievementsThemeErrorToast:    'Не удалось применить тему',
        achievementFavorites25Title:    'Ценитель',
        achievementFavorites25Desc:     '50 избранных',
        achievementAuthors10Title:      'Начитанность',
        achievementAuthors10Desc:       '25 разных авторов',
        achievementExplorerTitle:       'Исследователь',
        achievementExplorerDesc:        'Добавление цитаты, избранное, импорт, смена темы, правка профиля',
        achievementWeekStreakTitle:     'Неделя с Epigraph',
        achievementWeekStreakDesc:      '7 дней активности подряд',
        badgeNoviceTitle:               'Новичок',
        badgeNoviceDesc:                'Добавьте первую цитату вручную',
        badgeChroniclerTitle:           'Летописец',
        badgeChroniclerDesc:            '7 дней активности',
        badgeCollectorTitle:            'Собиратель',
        badgeCollectorDesc:             '21 день активности',
        badgeBibliophileTitle:          'Искатель',
        badgeBibliophileDesc:           '50 дней активности',
        badgeKeeperTitle:               'Хранитель',
        badgeKeeperDesc:                '100 дней активности',
        badgeInterpreterTitle:          'Толкователь',
        badgeInterpreterDesc:           '200 дней активности',
        badgeArchivistTitle:            'Архивариус',
        badgeArchivistDesc:             '365 дней активности',
        badgeMentorTitle:               'Наставник',
        badgeMentorDesc:                '750 дней активности',
        badgeSageTitle:                 'Мудрец',
        badgeSageDesc:                  '1500 дней активности',
        achievementUnlockedHeading:     'Достижение получено',
        achievementUnlockedRewardTheme: 'Открыта тема «{theme}»',
        achievementUnlockedRewardBadge: 'Новый бейдж: {badge}',
        achievementUnlockedLaterBtn:    'Закрыть',
        achievementUnlockedToast:       'Новое достижение: {title}',

        settingsNotifTitle:             'Уведомления',
        settingsNotifIosHint:           'Для уведомлений: Safari → <strong>Поделиться</strong> → <strong>«На экран "Домой"»</strong> → запустите приложение оттуда.',
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

        // ── Generic segmented-toggle labels ─────────────────────────────────────────
        toggleOff:                      'Выкл',
        toggleOn:                       'Вкл',

        // ── Notification interval labels ──────────────────────────────────────────
        notifInterval6h:                'Каждые 6 часов',
        notifInterval12h:               'Каждые 12 часов',
        notifInterval24h:               'Раз в день',
        notifIntervalShort6h:           '6ч',
        notifIntervalShort12h:          '12ч',
        notifIntervalShort24h:          '24ч',

        // ── General ───────────────────────────────────────────────────────────
        toastLoginRequired:             'Войдите в аккаунт для доступа к этому разделу',
        toastError:                     'Ошибка',
    },

    en: {
        // ── Auth ──────────────────────────────────────────────────────────────
        authSubtitle:                   'Sign in to continue',
        authSubmitLogin:                'Sign in',
        authSubmitRegister:             'Sign up',
        authSwitchToLogin:              'Already have an account?',
        authSwitchToRegister:           "Don't have an account?",
        authSwitchBtnLogin:             'Sign in',
        authSwitchBtnRegister:          'Sign up',
        authPlaceholderEmail:           'you@example.com',
        authPlaceholderPasswordLogin:   'Your password',
        authPlaceholderPasswordRegister:'••••••••',
        authLoading:                    'Loading...',
        authTagline:                    'Your quotes. Every day.',
        authRegisterQuote1Text:         'It does not matter how slowly you go as long as you do not stop.',
        authRegisterQuote1Author:       '— Confucius',
        authRegisterQuote2Text:         "Life is what happens to you while you're busy making other plans.",
        authRegisterQuote2Author:       '— John Lennon',
        authRegisterQuote3Text:         'Well begun is half done.',
        authRegisterQuote3Author:       '— Aristotle',
        authRegisterHeading:            'Create an account',
        authRegisterSub:                "It's free. Forever.",
        authEmailLabel:                 'Email',
        authPasswordLabel:              'Password',
        authPasswordHint:               'At least 8 characters, with one letter and one digit.',
        authDivider:                    'or',
        authGoogleButton:               'Sign in with Google',
        authYandexButton:               'Sign in with Yandex',
        authUsernameLabel:              'Username',
        authUsernamePlaceholder:        'bookworm42',

        // Auth validation errors ────────────────────────────────────────────────────────
        authErrorFillAllFields:         'Fill in all fields',
        authErrorInvalidEmail:          'Enter a valid email',
        authErrorInvalidEmailDot:       'Enter a valid email.',
        authErrorPasswordTooShort:      'Password must be at least 8 characters',
        authErrorPasswordTooLong:       'Password is too long (128 characters max)',
        authErrorPasswordNoLetter:      'Password must contain at least one letter',
        authErrorPasswordNoDigit:       'Password must contain at least one digit',
        authErrorPasswordPattern:       'At least 8 characters, with a letter and a digit.',
        authErrorWrongCredentials:      'Incorrect email or password',
        authGeoBlocked:                 'Google sign-in is unavailable in your region',
        authGeoBlockedYandex:           'Yandex sign-in is only available from Russia',
        authErrorInvalidEmailServer:    'Invalid email',
        authErrorConnection:            'Connection error',
        authErrorUsernameInvalid:       'Username: 3–20 characters, Latin letters, digits, and underscores',

        // Auth Email Verification ────────────────────────────────────────────────────────
        verifyTitle:            'Confirm your email',
        verifySubtitle:         'We sent a 6-digit code to {email}',
        verifyCodeLabel:        'Code from the email',
        verifySubmit:           'Confirm',
        verifyErrorInvalidCode: 'Invalid or expired code',
        verifyResendHint:       "Didn't get the email?",
        verifyResendLink:       'Resend',
        verifyResendSuccess:    'Code resent',
        verifyResendError:      'Failed to send the code',
        verifyBack:             'Back',

        // ── Profile setup modal (shown right after email verification) ─────────
        profileSetupTitle:      'Set up your profile',
        profileSetupDesc:       "Pick an icon and a username — it's just for you inside the app, no need to use your real name. You can change it anytime in Settings.",
        profileSetupSkip:       'Skip',

        // ── Change password ───────────────────────────────────────────────────
        changePasswordTitle:              'Change password',
        changePasswordSettingsDesc:       'Set or change your password for email sign-in.',
        changePasswordButton:             'Change password',
        changePasswordNew:                'New password',
        changePasswordConfirm:            'Confirm new password',
        changePasswordNewPlaceholder:     'At least 8 characters',
        changePasswordConfirmPlaceholder: 'Repeat the new password',
        changePasswordSubmit:             'Save',
        changePasswordSuccess:            'Password changed successfully',
        changePasswordErrorMismatch:      'Passwords do not match',

        // ── Edit username modal ───────────────────────────────────────────────
        editUsernameTitle:                'Change username',
        editUsernameLabel:                'Username',
        editUsernamePlaceholder:          'bookworm42',
        editUsernameErrorRequired:        'Enter a username',
        editUsernameErrorLength:          '3 to 20 characters',
        editUsernameErrorChars:           'Latin letters, digits, and underscores only',
        editUsernameErrorInvalid:         'Invalid username',
        editUsernameSuccess:              'Username updated',

        // ── Avatar picker modal ────────────────────────────────────────────────
        avatarPickerSuccess:              'Icon updated',
        avatarPickerError:                'Failed to update the icon',

        // ── Avatar icon labels (keys mirror AVATAR_ICON_KEYS in avatars.js) ────
        avatarIconNeutral:                'Neutral',
        avatarIconBear:                   'Bear',
        avatarIconCat:                    'Cat',
        avatarIconDog:                    'Dog',
        avatarIconHamster:                'Hamster',
        avatarIconRabbit:                 'Rabbit',
        avatarIconFox:                    'Fox',
        avatarIconOwl:                    'Owl',
        avatarIconElephant:               'Elephant',
        avatarIconMouse:                  'Mouse',
        avatarIconDuck:                   'Duck',
        avatarIconSeal:                   'Seal',

        // ── Forgot password ──────────────────────────────────────────────────────
        forgotPasswordLink:               'Forgot your password?',
        forgotPasswordTitle:              'Password recovery',
        forgotPasswordDesc:               "Enter your email and we'll send you a link to reset your password.",
        forgotPasswordEmailLabel:         'Email',
        forgotPasswordSubmit:             'Send link',
        forgotPasswordSuccessHint:        "If an account with this email exists, you'll receive an email within a minute.",
        forgotPasswordBack:               'Back to sign in',

        // ── Navigation ────────────────────────────────────────────────────────
        navToday:                       'Today',
        navMyQuotes:                    'My quotes',
        navAdd:                         'Add',
        navSettings:                    'Settings',
        ariaToggleTheme:                'Toggle theme',
        ariaSwitchToLightTheme:         'Switch to light theme',
        ariaSwitchToDarkTheme:          'Switch to dark theme',
        ariaToggleLanguage:             'Switch language',
        ariaLogout:                     'Sign out',
        ariaBannerClose:                'Close',

        // ── QOD (Quote of the Day) ────────────────────────────────────────────
        qodEmptyText:                   'Add your first quote in the Add section',
        qodProgress:                    'Quote {current} of {total}',
        qodRandomBtn:                   'Random',
        qodCopyBtn:                     'Copy',
        toastNoQuotesYet:               'Add at least one quote first',

        // ── Quote list ────────────────────────────────────────────────────────
        ariaFavorite:                   'Add to favorites',
        ariaCopy:                       'Copy',
        ariaEdit:                       'Edit',
        ariaDelete:                     'Delete',
        ariaSearch:                     'Search',
        searchPlaceholder:              'Search quotes...',
        listHeading:                    'My quotes',
        filterAll:                      'All',
        filterFav:                      '⭐ Favorites',
        expandHintOpen:                 'Click to read in full ↓',
        expandHintClose:                'Collapse ↑',
        emptyStateNoQuotes:             'No quotes yet',
        emptyStateNoResults:            'Nothing found',
        emptyStateNoQuotesHint:         'Go to the Add section',
        emptyStateNoResultsHint:        'Try a different search',
        statsTotal:                     '{total} quotes total',
        statsFavorites:                 '{count} favorited',
        listShowMore:                   'Show more ({remaining})',

        // ── Sort ──────────────────────────────────────────────────────────────
        sortDateDesc:                   'Newest first',
        sortDateAsc:                    'Oldest first',
        sortAuthorAsc:                  'By author (A–Z)',
        sortAuthorDesc:                 'By author (Z–A)',

        // ── Add quote form ────────────────────────────────────────────────────
        placeholderQuoteText:           'Enter the quote text…',
        placeholderAuthor:              "Author's name",
        placeholderSource:              'Book, movie, speech…',
        addTitle:                       'Add a quote',
        addSubtitle:                    'Add quotes manually, import them from a JSON file, or bring them over from Yandex Books.',
        addLabelText:                   'Quote text',
        addLabelAuthor:                 'Author',
        addLabelSource:                 'Source',
        addLabelTags:                   'Tags',
        addRequired:                    '(required)',
        addOptional:                    '(optional)',
        addSubmitBtn:                   'Add quote',
        addClearBtn:                    'Clear',
        addImportTitle:                 'Import quotes',
        addImportTabJson:               'JSON file',
        addImportTabYandex:             'Yandex Books',
        addImportDropLabel:             'Choose a file or drop it here',
        importJsonHint:                 'Upload a <code class="inline-code">.json</code> file with your quotes.',
        importJsonFieldsHint:           'Format: an array of objects with the fields <code>text</code>, <code>author</code>, <code>source</code>',
        addJsonExampleLabel:            'Example JSON structure:',
        addJsonExampleContent:          '[\n  {\n    "text": "Quote text",\n    "author": "Author name",\n    "source": "Book title"\n  }\n]',
        placeholderTagInput:            'tag…',
        tagAddButtonLabel:              'tag',
        ariaTagRemove:                  'Remove tag',
        ariaTagAdd:                     'Add tag',
        toastQuoteTextRequired:         'Quote text is required',
        toastQuoteAdded:                'Quote added!',
        toastQuoteSaveError:            'Failed to save',
        toastQuoteLimitReached:         'You have reached the {limit}-quote limit. Delete some quotes to add new ones.',
        toastValidationError:           'Validation error',

        // ── Edit quote modal ──────────────────────────────────────────────────
        editModalTitle:                 'Edit quote',
        placeholderEditQuoteText:       'Quote text...',
        placeholderEditAuthor:          "Author's name",
        placeholderEditSource:          'Book, movie, speech...',
        editSaveButton:                 'Save',
        editCancelButton:               'Cancel',
        toastQuoteUpdated:              'Quote updated',
        toastQuoteUpdateError:          'Failed to save',
        toastConnectionError:           'Connection error',

        // ── Delete quote modal ────────────────────────────────────────────────
        deleteModalTitle:               'Delete this quote?',
        deleteModalCannotUndo:          'This action cannot be undone.',
        deleteButton:                   'Delete',
        cancelButton:                   'Cancel',
        toastQuoteDeleted:              'Quote deleted',
        toastDeleteError:               'Failed to delete',

        // ── Delete all quotes modal ───────────────────────────────────────────
        deleteAllModalTitle:            'Delete all your quotes?',
        deleteAllModalBody:             "You're about to delete all {count} quotes. This action cannot be undone.",
        deleteAllButton:                'Delete all',
        toastAllQuotesDeleted:          'All your quotes have been deleted',

        // ── Delete account modal ──────────────────────────────────────────────
        deleteAccountTitle:             'Delete your account?',
        deleteAccountBody:              'This action is irreversible. All your quotes and data will be permanently deleted.',
        deleteAccountButton:            'Yes, delete',
        deleteAccountToastError:        'Failed to delete the account. Please try again later.',

        // ── Delete confirm phrases ────────────────────────────────────────────
        deleteAllConfirmPhrase:         'I want to delete all quotes',
        deleteAllConfirmPlaceholder:    'Type the phrase to confirm',
        deleteAccountConfirmPhrase:     'I want to delete my account',
        deleteAccountConfirmPlaceholder:'Type the phrase to confirm',
        deleteConfirmHint:              'To confirm, type:',

        // ── Import / Export ───────────────────────────────────────────────────
        importExpectedArray:            'Expected an array',
        importNoValidItems:             'No quotes with text were found in the file',
        toastImportError:               'Import error: {message}',
        toastCopied:                    'Copied!',
        toastCopyError:                 'Failed to copy',
        copiedButtonLabel:              'Copied',

        // ── Import preview modal ──────────────────────────────────────────────
        importPreviewTitle:             'Import preview',
        importPreviewSummary:           'Found {count} {word} in the uploaded file. Review a few examples below and confirm the import.',
        importPreviewMore:              'and {count} more {word}',
        importPreviewConfirm:           'Import {count} {word}',
        importProgressLabel:            'Importing: {current} of {total}',
        importStopBtn:                  'Stop',
        closeButton:                    'Close',
        importSummaryDone:              'Done! Added {count} {word}.',
        importSummaryStopped:           'Import stopped. Added {count} of {total} {word}.',
        importSummaryError:             'Import interrupted by a connection error. Added {count} of {total} {word}.',
        importSummarySkipped:           'Skipped {count} {word} — failed validation (text, author, or source too long).',
        importDownloadRejectedBtn:      'Download JSON with these quotes',

        // ── Import from Yandex Books ──────────────────────────────────────────
        importYandexBenefit:            "Worth using if you've built up more than 20–30 quotes in Yandex Books — moving them over one by one by hand would take much longer. If you only have a couple, it's easier to just add them in the form above.",
        importYandexStep1Prefix:        'Open ',
        importYandexStep1Suffix:        ', go to your profile, and log in.',
        importYandexStep2:              'Open the browser console (F12 → Console), paste the script, and press Enter.',
        importYandexDesktopOnly:        'Only available in a desktop browser — phones lack the developer tools this method needs.',
        importYandexStep3Prefix:        'The script will download a file called ',
        importYandexStep3Suffix:        ' — upload it below like a regular JSON file.',
        importYandexCopyBtn:            'Copy script',
        importYandexUploadLabel:        'Upload the downloaded file',
        importYandexFaqSummary:         'Is this safe? What is the console?',
        importYandexFaqQ1:              'What is the browser console?',
        importYandexFaqA1:              'A developer panel built into every browser. It can run code right on the open page — but it has no access to your files, passwords, or other sites.',
        importYandexFaqQ2:              'Is it safe to paste code there?',
        importYandexFaqA2:              'The script runs only in your browser and only talks to books.yandex.ru under your own session. Epigraph never receives or stores your Yandex password or cookies — only the quotes file you upload yourself.',
        importYandexFaqQ3:              'The browser showed a warning when I pasted — is that normal?',
        importYandexFaqA3:              "Yes, that's standard protection against accidentally pasting malicious code. Since you copied the script from this page, you're fine — just confirm the paste. But never paste console code from sources you don't trust.",
        importYandexFaqQ4:              "F12 doesn't open the panel — what do I do?",
        importYandexFaqA4:              'Right-click anywhere on the page and choose "Inspect". On Mac you can also press Cmd+Option+I, on Windows Ctrl+Shift+I. In Safari, first enable the "Develop" menu in the browser settings.',
        importYandexFaqQ5:              'How long does this take?',
        importYandexFaqA5:              'If your library has a lot of books (hundreds), the script can take a minute or two — it queries each book individually with a small pause between requests so it doesn\'t overload Yandex\'s server. Wait for the "ГОТОВО" message in the console before uploading the downloaded file.',

        // ── Settings page (static markup) ───────────────────────────────────
        settingsTitle:                  'Settings',
        settingsAccountTitle:           'Account',
        settingsAccountEditAria:        'Change username',
        settingsAccountAvatarAria:      'Change icon',
        settingsLogoutBtn:              'Sign out',
        settingsLanguageTitle:          'Interface language',
        settingsLanguageDesc:           'Switch the app interface language.',
        settingsThemeTitle:             'Theme',
        settingsThemeDesc:              'Choose the app\'s look. Light and dark mode switch separately.',
        ariaChooseThemeStyle:           'Choose theme',
        themeStyleClassic:              'Classic',
        themeStyleForest:               'Forest',
        themeStyleCosmos:               'Cosmos',
        themeStyleOcean:                'Ocean',
        themeStyleSunset:               'Sunset',

        // ── Achievements (TASK-122) ──────────────────────────────────────────
        settingsAchievementsTitle:      'Achievements',
        settingsAchievementsDesc:       'Progress and rewards for using the app.',
        ariaOpenAchievements:           'Open achievements',
        achievementsOpenBtn:            'Open',
        achievementsSummary:            '{unlocked} of {total} unlocked',
        achievementsThemesSection:      'Themes',
        achievementsBadgesSection:      'Badges',
        achievementsNearestThemesSection: 'Nearest achievements',
        achievementsCurrentBadge:       'Current badge',
        achievementsCurrentBadgeEmpty:  'Not earned yet',
        achievementsNextBadge:          'Next',
        achievementsShowAllBtn:         'All achievements ({total}) →',
        achievementsBackBtn:            '← Nearest',
        achievementsApplyThemeBtn:      'Apply "{theme}" theme',
        achievementsThemeAppliedToast:  'Theme applied',
        achievementsThemeErrorToast:    'Couldn\'t apply the theme',
        achievementFavorites25Title:    'Connoisseur',
        achievementFavorites25Desc:     '50 favorites',
        achievementAuthors10Title:      'Well-read',
        achievementAuthors10Desc:       '25 different authors',
        achievementExplorerTitle:       'Explorer',
        achievementExplorerDesc:        'Add a quote, favorite one, import, switch theme, edit profile',
        achievementWeekStreakTitle:     'A week with Epigraph',
        achievementWeekStreakDesc:      '7 days of consecutive activity',
        badgeNoviceTitle:               'Novice',
        badgeNoviceDesc:                'Add your first quote by hand',
        badgeChroniclerTitle:           'Chronicler',
        badgeChroniclerDesc:            '7 days active',
        badgeCollectorTitle:            'Collector',
        badgeCollectorDesc:             '21 days active',
        badgeBibliophileTitle:          'Seeker',
        badgeBibliophileDesc:           '50 days active',
        badgeKeeperTitle:               'Keeper',
        badgeKeeperDesc:                '100 days active',
        badgeInterpreterTitle:          'Interpreter',
        badgeInterpreterDesc:           '200 days active',
        badgeArchivistTitle:            'Archivist',
        badgeArchivistDesc:             '365 days active',
        badgeMentorTitle:               'Mentor',
        badgeMentorDesc:                '750 days active',
        badgeSageTitle:                 'Sage',
        badgeSageDesc:                  '1500 days active',
        achievementUnlockedHeading:     'Achievement unlocked',
        achievementUnlockedRewardTheme: 'Unlocked the "{theme}" theme',
        achievementUnlockedRewardBadge: 'New badge: {badge}',
        achievementUnlockedLaterBtn:    'Close',
        achievementUnlockedToast:       'New achievement: {title}',

        settingsNotifTitle:             'Notifications',
        settingsNotifIosHint:           'For notifications: Safari → <strong>Share</strong> → <strong>"Add to Home Screen"</strong> → launch the app from there.',
        settingsNotifQodTitle:          'Quote of the day',
        settingsNotifQodDesc:           'A push notification with a quote. Works even with the tab closed.',
        settingsNotifFreqTitle:         'Frequency',
        settingsNotifFreqDesc:          'How often to send the notification.',
        settingsDataTitle:              'Data',
        settingsExportTitle:            'Export to JSON',
        settingsExportDesc:             'Download all your quotes for backup or transfer.',
        settingsExportBtn:              'Export',
        settingsCopyAllTitle:           'Copy all as text',
        settingsCopyAllDesc:            'Copy all your quotes to the clipboard as plain text.',
        settingsCopyAllBtn:             'Copy',
        settingsImportTitle:            'Import from JSON',
        settingsImportDesc:             'Upload a file with a list of quotes to add to your collection.',
        settingsImportBtn:              'Import',
        settingsDangerTitle:            'Danger zone',
        settingsDeleteAllTitle:         'Delete all your quotes',
        settingsDeleteAllDesc:          'Permanently delete all your quotes from the app.',
        settingsDeleteAccountTitle:     'Delete account',
        settingsDeleteAccountDesc:      'Permanently delete your account and all your data.',
        settingsDeleteAccountBtn:       'Delete account',
        settingsAboutTitle:             'About',
        settingsAboutDesc:              'A personal quote collection — keep, read, and share what inspires you.',
        settingsStorageTitle:           'Data storage',
        settingsStorageDesc:            'Your quotes are stored in the cloud and available from any device. Use export for backups.',
        settingsSourceTitle:            'Source code',
        settingsSourceDesc:             'An open-source project on GitHub.',
        ariaNotificationsToggle:        'Quote of the day notifications',

        // ── Notifications ─────────────────────────────────────────────────────
        toastPushNotSupported:          'Your browser does not support push notifications',
        toastPushAskPermission:         'Your browser will now ask for permission — click "Allow"',
        toastPushDenied:                'Allow notifications in your browser settings',
        toastPushUnavailable:           'Push notifications are temporarily unavailable',
        toastPushEnabled:               'Notifications enabled',
        toastPushSubscribeError:        'Failed to subscribe to notifications',
        toastPushDisabled:              'Notifications disabled',
        toastPushUnsubscribeError:      'Failed to unsubscribe from notifications',
        toastPushLoginRequired:         'Sign in to configure notifications',

        // ── Plural forms ──────────────────────────────────────────────────────────
        pluralQuote1:                   'quote',
        pluralQuote2:                   'quotes',
        pluralQuote5:                   'quotes',
        statsSummary:                   '{total} {word} · {favorites} favorited',

        // ── Favorite button tooltip ───────────────────────────────────────────────
        favActive:                      'In favorites',
        favInactive:                    'Add to favorites',

        // ── Generic segmented-toggle labels ─────────────────────────────────────────
        toggleOff:                      'Off',
        toggleOn:                       'On',

        // ── Notification interval labels ──────────────────────────────────────────
        notifInterval6h:                'Every 6 hours',
        notifInterval12h:               'Every 12 hours',
        notifInterval24h:               'Once a day',
        notifIntervalShort6h:           '6h',
        notifIntervalShort12h:          '12h',
        notifIntervalShort24h:          '24h',

        // ── General ───────────────────────────────────────────────────────────
        toastLoginRequired:             'Sign in to access this section',
        toastError:                     'Error',
    }
};

/** Currently active language code. */
let currentLanguage = localStorage.getItem('epigraph_lang') || 'ru';
document.documentElement.lang = currentLanguage;

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
 * Returns the correctly declined word for "quote(s)" for the given count,
 * in the current language. Russian has 3 plural forms (mod10/mod100 rule);
 * every other language falls back to a simple singular/plural split.
 * @param {number} n
 * @returns {string}
 */
function quoteCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralQuote1') : t('pluralQuote2');
    }
    return pluralRu(n, t('pluralQuote1'), t('pluralQuote2'), t('pluralQuote5'));
}

/**
 * Switches the active language, persists the choice, and re-applies
 * translations to the static markup (data-i18n* attributes). Does not
 * re-render dynamically generated content (quote list, modals, etc.) —
 * callers that need those updated should reload the page instead (see the
 * language toggle button handler in ui.js).
 * @param {string} lang - 'ru' or 'en'.
 */
function setLanguage(lang) {
    if (!TRANSLATIONS[lang] || lang === currentLanguage) return;

    currentLanguage = lang;
    try {
        localStorage.setItem('epigraph_lang', lang);
    } catch (e) {
    }
    document.documentElement.lang = lang;
    applyI18n();

    if (typeof updateLangToggleLabel === 'function') updateLangToggleLabel();
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
 *   data-i18n-html="key"        → el.innerHTML (for strings with embedded inline markup, e.g. <code>)
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
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml);
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

    // Nav-tab and segmented-toggle labels just changed width (these are the only i18n
    // consumers whose text feeds a layout measurement) — re-sync the sliding pills so
    // they aren't sized against whatever text happened to be there before applyI18n()
    // ran. bootstrap.js's guest branch has an `await` before it calls
    // renderQod()/moveNavIndicator() for the first time, so there's no guaranteed order
    // between that first measurement and this (possibly DOMContentLoaded-deferred) call
    // — this makes the outcome correct regardless of which one actually runs first.
    if (typeof moveNavIndicator === 'function') moveNavIndicator();
    if (typeof moveAllToggleIndicators === 'function') moveAllToggleIndicators();
}
