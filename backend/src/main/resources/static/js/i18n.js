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
        authErrorEmailNotVerified:      'Email не подтверждён. Подтвердите его, чтобы войти.',
        authErrorEmailAlreadyRegistered:'Этот email уже зарегистрирован',
        authErrorUserNotFound:          'Пользователь не найден',
        resetLinkInvalid:               'Ссылка недействительна или истекла',
        errBadRequest:                  'Некорректный запрос',
        errQuoteLimit:                  'Достигнут лимит цитат на аккаунт',
        authGeoBlocked:                 'Вход через Google недоступен в вашем регионе',
        authGeoBlockedYandex:           'Вход через Яндекс доступен только из России',
        authErrorInvalidEmailServer:    'Некорректный email',
        authErrorConnection:            'Ошибка соединения',
        authErrorUsernameInvalid:       'Имя пользователя: 3–20 символов, латинские буквы, цифры и подчёркивание',

        // Auth Email Verification ────────────────────────────────────────────────────────
        verifyTitle:            'Подтвердите email',
        verifySubtitle:         'Мы отправили 6-значный код на {email}',
        verifyFromLoginNotice:  'Этот аккаунт ещё не подтверждён. Мы отправили код на {email} — введите его, чтобы войти.',
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
        changePasswordSettingsDesc:       'Пароль для входа по email.',
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
        avatarIconSnail:                  'Улитка',
        avatarIconBee:                    'Пчела',
        avatarIconFrog:                   'Лягушка',
        avatarIconNightingale:            'Соловей',
        avatarPlusLocked:                 'Доступно в Epigraph Plus',

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
        ariaAccountMenu:                'Меню аккаунта',
        accountMenuPlus:                'Epigraph Plus',
        accountMenuPlusActive:          'активен',
        accountMenuPlusBenefitsTitle:   'В подписке',
        accountMenuPlusBenefitLimit:    'До {limit} цитат',
        accountMenuPlusBenefitNoir:     'Эксклюзивная тема «Нуар»',
        accountMenuPlusBenefitAvatars:  'Эксклюзивные аватары',
        accountMenuPlusBenefitStats:    'Расширенная статистика',
        accountMenuLogout:              'Выход',
        ariaScrollTop:                  'Наверх',
        ariaAchievementInfo:            'Подробнее',
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
        ariaShare:                      'Поделиться',
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
        addImportTabGoodreads:          'Goodreads',
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
        importErrorQuoteTooLong:        'Цитата длиннее 1000 символов',
        importErrorAuthorTooLong:       'Имя автора длиннее 100 символов',
        importErrorSourceTooLong:       'Источник длиннее 200 символов',
        importErrorTagsTooLong:         'Теги длиннее 500 символов',
        importErrorGeneric:             'Не прошло проверку',
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

        // ── Yandex Books console script (messages the user reads in the browser console) ──
        yandexScriptPromptLogin:        'Введи свой логин на books.yandex.ru (из адреса профиля /@login):',
        yandexScriptNoLogin:            'Логин не указан, прерываю.',
        yandexScriptLibraryError:       'Ошибка библиотеки:',
        yandexScriptCollecting:         'Собираю список книг...',
        yandexScriptFoundBooks:         'Найдено книг:',
        yandexScriptBookError:          'Ошибка для книги',
        yandexScriptProcessed:          'Обработано:',
        yandexScriptQuotesCollected:    'цитат собрано:',
        yandexScriptDone:               'ГОТОВО. Всего цитат:',

        // ── Import from Goodreads (TASK-138) ──────────────────────────────────
        importGoodreadsBenefit:         'Переносит цитаты, которые ты отметил лайком на Goodreads (раздел «My Quotes» в профиле). Стоит использовать, если их набралось много — по одной переносить долго.',
        importGoodreadsStep1Prefix:     'Открой ',
        importGoodreadsStep1Suffix:     ', залогинившись — это твой список избранных цитат.',
        importGoodreadsStep2:           'Открой консоль браузера (F12 → Console), вставь скрипт и нажми Enter.',
        importGoodreadsCopyBtn:         'Скопировать скрипт',
        importGoodreadsDesktopOnly:     'Доступно только в браузере на компьютере — на телефоне нет инструментов разработчика, которые нужны для этого способа.',
        importGoodreadsStep3Prefix:     'Скрипт скачает файл ',
        importGoodreadsStep3Suffix:     ' — загрузи его ниже, как обычный JSON.',
        importGoodreadsUploadLabel:     'Загрузить скачанный файл',
        importGoodreadsFaqA2:           'Скрипт работает только в твоём браузере и обращается только к goodreads.com под твоей же сессией. Epigraph не получает и не хранит ни пароль, ни куки твоего аккаунта Goodreads — только файл с цитатами, который ты сам сюда загружаешь.',
        importGoodreadsFaqQ5:           'Что именно переносится?',
        importGoodreadsFaqA5:           'Цитаты из твоего списка «My Quotes» на Goodreads — те, что ты отметил лайком. Дата добавления на Goodreads не сохраняется, поэтому у импортированных цитат ставится текущая дата. Дождись сообщения «ГОТОВО» в консоли, прежде чем загружать файл.',

        // ── Goodreads console script (messages the user reads in the browser console) ──
        goodreadsScriptCollecting:      'Собираю цитаты с Goodreads...',
        goodreadsScriptPage:            'Страница',
        goodreadsScriptQuotesCollected: 'цитат собрано:',
        goodreadsScriptDone:            'ГОТОВО. Всего цитат:',
        goodreadsScriptNoQuotes:        'Цитаты не найдены. Убедись, что ты залогинен на goodreads.com и в списке «My Quotes» есть отмеченные цитаты.',

        // ── Settings page (static markup) ───────────────────────────────────
        settingsTitle:                  'Настройки',
        settingsAccountTitle:           'Аккаунт',
        settingsAccountEditAria:        'Изменить имя пользователя',
        settingsAccountAvatarAria:      'Изменить иконку',
        settingsLanguageTitle:          'Язык интерфейса',
        settingsLanguageDesc:           'Язык интерфейса.',
        settingsThemeTitle:             'Тема оформления',
        settingsThemeDesc:              'Светлый и тёмный режим — отдельно.',
        ariaChooseThemeStyle:           'Выбрать тему оформления',
        themeStyleClassic:              'Классика',
        themeStyleForest:               'Лес',
        themeStyleCosmos:               'Космос',
        themeStyleOcean:                'Океан',
        themeStyleSunset:               'Закат',
        themeStyleNoir:                 'Нуар',
        themeStylePlusHint:             'Epigraph Plus',
        redeemThanksTitle:              'Спасибо за поддержку!',
        redeemThanksBody:               'Epigraph Plus активирован. Открыта эксклюзивная тема Noir и другие возможности Plus.',
        redeemApplyNoir:                'Применить Noir',
        redeemErrorInvalid:             'Код недействителен или уже использован',

        // ── Achievements (TASK-122) ──────────────────────────────────────────
        settingsAchievementsTitle:      'Достижения',
        settingsAchievementsDesc:       'Прогресс и награды.',
        ariaOpenAchievements:           'Открыть достижения',
        achievementsOpenBtn:            'Открыть',
        achievementsSummary:            '{unlocked} из {total} получено',
        achievementsThemesSection:      'Темы',
        achievementsBadgesSection:      'Бейджи',
        achievementsStatsSection:       'Статистика',
        achievementsNearestThemesSection: 'Ближайшие достижения',
        achievementsCurrentBadge:       'Текущий бейдж',
        achievementsCurrentBadgeEmpty:  'Ещё не получен',
        achievementsNextBadge:          'Следующий',
        achievementsShowAllBtn:         'Все достижения ({total}) →',
        achievementsBackBtn:            '← Ближайшие',
        achievementsApplyThemeBtn:      'Применить тему',
        achievementsThemeAppliedToast:  'Тема применена',
        achievementsThemeErrorToast:    'Не удалось применить тему',
        achievementFavorites25Title:    'Ценитель',
        achievementFavorites25Desc:     '50 избранных',
        achievementAuthors10Title:      'Начитанность',
        achievementAuthors10Desc:       '15 разных авторов, добавленных <b>вручную</b>',
        achievementExplorerTitle:       'Исследователь',
        achievementExplorerDesc:        'Добавление цитаты, избранное, импорт, смена темы, правка профиля',
        achievementWeekStreakTitle:     'Неделя с Epigraph',
        achievementWeekStreakDesc:      '7 дней активности подряд',
        achievementQuotes50Title:       'Полсотни',
        achievementQuotes50Desc:        '50 добавленных цитат',
        achievementQuoteDays10Title:    'Постоянство',
        achievementQuoteDays10Desc:     'Цитаты в 10 разных дней',
        achievementsImportHint:         'Цитаты, импортированные из файла, не считаются для достижения «Начитанность».',
        achievementsImportHintNovice:   'Цитаты, импортированные из файла, не считаются для достижения «Новичок».',
        badgeNoviceTitle:               'Новичок',
        badgeNoviceDesc:                'Добавьте первую цитату <b>вручную</b>',
        badgeChroniclerTitle:           'Летописец',
        badgeChroniclerDesc:            '5 дней активности',
        badgeCollectorTitle:            'Собиратель',
        badgeCollectorDesc:             '15 дней активности',
        badgeBibliophileTitle:          'Искатель',
        badgeBibliophileDesc:           '30 дней активности',
        badgeKeeperTitle:               'Хранитель',
        badgeKeeperDesc:                '60 дней активности',
        badgeInterpreterTitle:          'Толкователь',
        badgeInterpreterDesc:           '100 дней активности',
        badgeArchivistTitle:            'Архивариус',
        badgeArchivistDesc:             '250 дней активности',
        badgeMentorTitle:               'Наставник',
        badgeMentorDesc:                '500 дней активности',
        badgeSageTitle:                 'Мудрец',
        badgeSageDesc:                  '1000 дней активности',
        achievementUnlockedHeading:     'Достижение получено',
        achievementUnlockedRewardTheme: 'Открыта тема «{theme}»',
        achievementUnlockedRewardBadge: 'Новый бейдж: {badge}',
        achievementUnlockedRewardStat:  'Открыта статистика «{stat}»',
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
        settingsSupportTitle:           'Поддержать проект',
        settingsSupportDesc:            'Открой Epigraph Plus и поддержи проект.',
        settingsSourceTitle:            'Исходный код',
        settingsSourceDesc:             'Проект с открытым исходным кодом на GitHub.',
        settingsContactTitle:           'Обратная связь',
        settingsContactDesc:            'Есть вопрос или предложение? Напишите мне.',
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
        pluralDay1:                     'день',
        pluralDay2:                     'дня',
        pluralDay5:                     'дней',
        pluralMonth1:                   'месяц',
        pluralMonth2:                   'месяца',
        pluralMonth5:                   'месяцев',
        pluralWord1:                    'слово',
        pluralWord2:                    'слова',
        pluralWord5:                    'слов',
        pluralPage1:                    'страница',
        pluralPage2:                    'страницы',
        pluralPage5:                    'страниц',
        pluralMovie1:                   'фильм',
        pluralMovie2:                   'фильма',
        pluralMovie5:                   'фильмов',
        pluralEpisode1:                 'выпуск',
        pluralEpisode2:                 'выпуска',
        pluralEpisode5:                 'выпусков',
        pluralSong1:                    'песня',
        pluralSong2:                    'песни',
        pluralSong5:                    'песен',
        pluralPair1:                    'пара',
        pluralPair2:                    'пары',
        pluralPair5:                    'пар',
        // Genitive month names, for "с мая 2026" — toLocaleDateString's long
        // month is nominative ("май"), which reads wrong after the preposition.
        monthsGenitive:                 'января,февраля,марта,апреля,мая,июня,июля,августа,сентября,октября,ноября,декабря',
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

        // ── Share (public quote page, TASK-125) ───────────────────────────────
        shareBadge:                     'Публичная цитата',
        sharePublicHint:                'Эта цитата публичная.\nДоступен только просмотр.',
        shareAddButton:                 'Добавить в коллекцию',
        shareViewInCollection:          'Посмотреть в коллекции',
        shareCopyQuote:                 'Копировать',
        shareLoginRequired:             'Войдите, чтобы добавить',
        shareImportSuccess:             'Цитата добавлена в вашу коллекцию',
        shareImportError:               'Не удалось добавить цитату',
        shareNotFoundTitle:             'Ссылка не найдена',
        shareNotFoundText:              'Эта цитата больше недоступна.',
        notFoundTitle:                  'Страница не найдена',
        notFoundText:                   'Похоже, эта страница потерялась между строк. Такой страницы не существует.',
        notFoundHomeBtn:                'На главную',
        shareOpenApp:                   'Открыть Epigraph',
        shareActionLabel:               'Поделиться',
        shareLinkCopied:                'Ссылка скопирована',
        shareLinkError:                 'Не удалось создать ссылку',

        settingsQuotesVisibilityTitle:  'Что видят друзья',
        settingsQuotesVisibilityDesc:   'Посторонние не видят ваши цитаты.',
        quotesVisibilityNone:           'Ничего',
        quotesVisibilityNoneDesc:       'Друзья не видят ни одной цитаты',
        quotesVisibilityFavorites:      'Только избранное',
        quotesVisibilityFavoritesDesc:  'Друзья видят цитаты, отмеченные звёздочкой',
        quotesVisibilityAll:            'Все цитаты',
        quotesVisibilityAllDesc:        'Друзья видят всю коллекцию целиком',
        quotesVisibilitySaved:          'Настройка сохранена',

        // ── Friends (TASK-129) ────────────────────────────────────────────────
        accountMenuFriends:             'Друзья',
        accountMenuStats:               'Статистика',
        statsTitle:                     'Статистика коллекции',
        statsSubtitle:                  'Ваша коллекция в цифрах',
        statsSectionOverview:           'Обзор',
        statsTileQuotes:                'Цитат',
        statsTileAuthors:               'Авторов',
        statsTileSources:               'Источников',
        statsTileTags:                  'Тегов',
        statsDeltaAddedMonth:           '+{count} за месяц',
        statsDeltaNewAuthors:           '+{count} за месяц',
        statsTileSourcesHint:           'книги, статьи, фильмы',
        statsTileTagsHint:              'темы и настроения',
        statsHeroFavAuthor:             'Любимый автор',
        statsHeroFavTag:                'Любимый тег',
        statsHeroAuthorMeta:            '{count} {word} · {fav} в избранном',
        statsHeroTagMeta:               '{count} {word} · самая частая тема',
        statsHeroNoAuthorTitle:         'Пока без авторов',
        statsHeroNoAuthorMeta:          'Добавьте автора к цитате',
        statsHeroNoTagTitle:            'Пока без тегов',
        statsHeroNoTagMeta:             'Добавьте теги к цитатам',
        statsFavRingCenter:             'в избранном',
        statsFavLegendFav:              '{count} избранных',
        statsFavLegendPlain:            '{count} обычных',
        statsEmptyTitle:                'Пока нечего показывать',
        statsEmptyText:                 'Добавьте первую цитату — и здесь появятся ваши авторы, темы и динамика коллекции.',
        statsEmptyBtn:                  'Добавить цитату',
        statsChartTitle:                'Активность за 12 месяцев',
        statsChartPeak:                 'Рекорд: {count} в {month} {year}',
        statsTopAuthorsTitle:           'Топ авторов',
        statsTopTagsTitle:              'Топ тегов',
        statsNoData:                    'Пока нет данных',
        statsAuthorsEmptyText:          'Укажите авторов у цитат',
        statsTagsEmptyText:             'Добавьте теги к цитатам',
        statsMonthsShort:               'янв,фев,мар,апр,май,июн,июл,авг,сен,окт,ноя,дек',
        statsMonthsPeak:                'январе,феврале,марте,апреле,мае,июне,июле,августе,сентябре,октябре,ноябре,декабре',
        statsSectionInteresting:        'Интересное',
        statsSectionMore:               'Ещё аналитика',
        statsCardGrowth:                'Рост коллекции',
        statsCardGrowthSub:             'Накопительно за всё время',
        statsCardLength:                'Длина цитат',
        statsCardLengthSub:             'Короткие · средние · длинные',
        statsCardWordCloud:             'Облако слов',
        statsCardWordCloudSub:          'Частые слова в ваших цитатах',
        statsWordsEmptyText:            'Добавьте цитаты с текстом — здесь появятся частые слова',
        statsCardComplexity:            'Сложность языка',
        statsCardComplexitySub:         'Оценка по длине слов и фраз',
        statsComplexityLevels:          'Простой,Лёгкий,Средний,Средне-сложный,Сложный',
        statsComplexityReasons:         'короткие слова, ясные фразы|простой, но не отрывистый|умеренная плотность текста|длинные слова, развёрнутые фразы|плотный, насыщенный текст',
        statsComplexityFactors:         'среднее слово {word} · во фразе {sentence}',
        statsComplexityDisclaimer:      'Приблизительная оценка, не научный индекс',
        statsComplexityEmptyText:       'Добавьте цитаты с текстом — оценим сложность',
        statsCardMood:                  'Настроение коллекции',
        statsCardMoodSub:               'Тональность цитат по словам · ≈ примерно',
        statsMoodLight:                 'Светлое',
        statsMoodNeutral:               'Нейтральное',
        statsMoodDark:                  'Тёмное',
        statsMoodQuestions:             'Также: {pct} цитат — вопросы, а не утверждения.',
        statsMoodDisclaimer:            'Оценка по словарю, не по смыслу',
        statsMoodEmptyText:             'Добавьте цитаты с текстом — оценим настроение',
        statsCardMilestones:            'Вехи и прогноз',
        statsCardMilestonesSub:         'Темп коллекции и ближайшие рубежи',
        statsMilePaceMonth:             '+{n} в месяц',
        statsMilePaceYear:              '+{n} в год',
        statsMileNow:                   'сейчас',
        statsMonthsForecast:            'январю,февралю,марту,апрелю,маю,июню,июлю,августу,сентябрю,октябрю,ноябрю,декабрю',
        statsMileForecast:              'До {target} — при текущем темпе к {date}.',
        statsMileForecastSlow:          'Следующий рубеж — {target}.',
        statsMileMax:                   'Все рубежи взяты — рекордная коллекция',
        statsMileAch:                   'Достижение «{title}» — {progress}/{threshold}.',
        statsMileEmptyText:             'Добавьте цитаты — покажем темп и рубежи',
        statsCardReading:               'Время чтения',
        statsCardReadingSub:            'Сколько читать всю коллекцию',
        statsReadingHM:                 '{h} ч {m} мин',
        statsReadingH:                  '{h} ч',
        statsReadingM:                  '{m} мин',
        statsReadingMovies:             '≈ {n} {word}',
        statsReadingPodcast:            '≈ {n} {word} подкаста',
        statsReadingSongs:              '≈ {n} {word}',
        statsReadingFlight:             '≈ рейс {route}',
        statsReadingTrips:              'Москва–Петербург|85;Москва–Казань|105;Москва–Сочи|140;Москва–Екатеринбург|150;Москва–Новосибирск|250;Москва–Иркутск|340;Москва–Владивосток|530',
        statsReadingEmptyText:          'Добавьте цитаты с текстом — посчитаем время',
        statsCardDup:                   'Гигиена: дубликаты',
        statsCardDupSub:                'Похожие и повторяющиеся цитаты',
        statsDupExact:                  'точный повтор',
        statsDupContained:              'расширенная версия',
        statsDupSimilar:                'похожи на {pct}%',
        statsDupBadge:                  '{n} {word}',
        statsDupMore:                   '+ ещё {n} {word}',
        statsDupDismiss:                'не дубликат',
        statsDupNoAuthor:               'без автора',
        statsDupCleanTitle:             'Дубликатов нет',
        statsDupCleanSub:               'все ваши цитаты уникальны',
        statsDupViewAll:                'Показать в «Мои цитаты» →',
        dupFilterChip:                  'Дубликаты · {n}',
        statsLengthShort:               'короткие',
        statsLengthMedium:              'средние',
        statsLengthLong:                'длинные',
        statsCardBook:                  'Коллекция как книга',
        statsCardBookSub:               'Объём в страницах',
        statsBookPages:                 '≈ {count} {word}',
        statsBookWords:                 '{count} {word} · как {frac} × {book}',
        statsBookCycleAria:             'Показать другую книгу',
        statsBookWarAndPeace:           '«Войны и мира»',
        statsBookCrimePunishment:       '«Преступления и наказания»',
        statsBookPridePrejudice:        '«Гордости и предубеждения»',
        statsBookNineteenEightyFour:    '«1984»',
        statsBookHarryPotter:           '«Гарри Поттера и философского камня»',
        statsCardLanguage:              'Язык коллекции',
        statsCardLanguageSub:           'По алфавиту текста',
        statsLangRu:                    'Русский',
        statsLangEn:                    'Английский',
        statsLangOther:                 'Другое',
        statsCardHall:                  'Зал славы',
        statsCardHallSub:               'Рекордсмены коллекции',
        statsHallFirst:                 'Первая цитата',
        statsHallLongest:               'Самая длинная',
        statsHallShortest:              'Самая короткая',
        statsHallBusiest:               'Рекорд за день',
        statsCardTempo:                 'Темп добавления',
        statsCardTempoSub:              'Цитат добавлено по кварталам',
        statsQuarterLabel:              '{n} квартал',
        statsMonthsFull:                'январь,февраль,март,апрель,май,июнь,июль,август,сентябрь,октябрь,ноябрь,декабрь',
        statsCardHeatmap:               'Активность',
        statsCardHeatmapSub:            'Дни, когда вы заходили',
        statsCalendarSub:               '{month} — дни, когда вы заходили',
        statsWeekdaysShort:             'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
        statsWeekdaysFull:              'Понедельник,Вторник,Среда,Четверг,Пятница,Суббота,Воскресенье',
        statsHeatVisit:                 'заходили',
        statsHeatQuote:                 'добавлена цитата',
        statsHeatToday:                 'сегодня',
        statsRailStreak:                '{word} подряд',
        statsRailActive:                '{word} активности',
        statsRailQuotes:                '{word} с цитатой',
        statsCardSeasonality:           'Сезонность',
        statsCardSeasonalitySub:        'В какие месяцы вы активнее',
        statsCardAuthorLength:          'Длина цитат по авторам',
        statsCardAuthorLengthSub:       'Среднее количество слов на цитату',
        statsCardAuthorCloud:           'Облако авторов',
        statsCardAuthorCloudSub:        'Размер — число цитат',
        statsCardAuthorScatter:         'Авторы: глубина × любовь',
        statsCardAuthorScatterSub:      'Число цитат × доля избранного',
        statsScatterX:                  '→ больше цитат',
        statsScatterY:                  '↑ чаще в избранном',
        statsCardCommunity:             'Место в сообществе',
        statsCardRhythm:                'Ваш ритм',
        statsCardRhythmSub:             'Когда вы собираете цитаты',
        statsCardCharacter:             'Характер цитат',
        statsCardCharacterSub:          'Вопросы, восклицания и другие знаки',
        statsSectionAchievement:        'Открываются при росте коллекции',
        statsLockedHint:                'Открывается достижением «{name}»',
        statsRhythmPeakDay:             'активнее всего',
        statsRhythmPeakTime:            'любимое время',
        statsTodNight:                  'Ночь',
        statsTodMorning:                'Утро',
        statsTodDay:                    'День',
        statsTodEvening:                'Вечер',
        statsCharQuestion:              'Вопросы',
        statsCharExclaim:               'Восклицания',
        statsCharEllipsis:              'Многоточия',
        statsCharNumber:                'С числами',
        statsCommunitySub:              'Как ваша коллекция смотрится рядом с другими',
        statsCommunityTopWord:          'Топ',
        statsCommunityTopShort:         'топ {pct}%',
        statsCommunityBiggerThan:       'крупнее, чем у {pct}% читателей',
        statsCommunityRowSize:          'Размер коллекции',
        statsCommunityRowActivity:      'Активность за месяц',
        statsCommunityRowFav:           'Доля избранного',
        statsCommunityLess:             'меньше',
        statsCommunityMore:             'больше',
        statsCommunityYouCount:         'вы · {count} {word}',
        statsCommunityLoading:          'Сравниваем с сообществом…',
        statsCommunityEarlyTitle:       'Вы среди первых',
        statsCommunityEarlyText:        'Сравнение появится, когда в Epigraph наберётся больше читателей.',
        statsPlusSectionTitle:          'Epigraph Plus',
        statsPlusTeaserTitle:           'Глубокая аналитика в Epigraph Plus',
        statsPlusTeaserCount:           'аналитик в Epigraph Plus',
        statsPlusTeaserText:            'Тепловые карты, тональность, сезонность, сравнение с сообществом и другие диаграммы',
        statsPlusFeatHeat:              'Тепловые карты активности',
        statsPlusFeatMood:              'Тональность и настроение',
        statsPlusFeatSeason:            'Сезонность по месяцам',
        statsPlusFeatCommunity:         'Сравнение с сообществом',
        statsPlusTeaserCta:             'Открыть Epigraph Plus',
        statsPlusInfoTitle:             'Epigraph Plus',
        statsPlusInfoBody:              'Оформите подписку — и Epigraph открывается полностью: глубокая аналитика коллекции плюс персонализация.',
        statsPlusInfoPerkStats:         'Расширенная статистика: тепловые карты, тональность, сезонность, сравнение с сообществом',
        statsPlusInfoPerkTheme:         'Эксклюзивная тема «Нуар» и аватары',
        statsPlusInfoPerkBadge:         'Бейдж Plus',
        statsPlusInfoPerkLimit:         'Повышенный лимит коллекции: 1000 → 5000 цитат',
        statsPlusInfoHow:               'Базовый Epigraph остаётся бесплатным и без рекламы. Подписка оформляется на Boosty — после оплаты вы получите промокод для активации.',
        statsPlusInfoSubscribe:         'Оформить на Boosty',
        statsPlusInfoClose:             'Понятно',
        statsFactStreakLabel:           'подряд в Epigraph',
        statsFactAvgLenLabel:           'символов — средняя длина цитаты',
        statsFactSavedLabel:            'сохранено от друзей',
        statsFactSourceLabel:           'цитат с указанным источником',
        statsFactSingleAuthorsLabel:    'авторов с единственной цитатой',
        statsFactAgeLabel:              'возраст коллекции',
        statsAgeYearShort:              'г',
        statsAgeMonthShort:             'мес',
        statsAgeLessMonth:              '< 1 мес',
        friendsTitle:                   'Друзья',
        friendsBackAria:                'Назад',
        friendsSearchPlaceholder:       'Поиск по имени',
        friendsSearchHint:              'Введите минимум 2 символа',
        friendsSearchEmpty:             'Никого не нашлось',
        friendsRequestsTitle:           'Заявки',
        friendsOutgoingTitle:           'Отправленные заявки',
        friendsListTitle:               'Мои друзья',
        friendsListEmpty:               'Пока никого. Найдите друзей по имени выше.',
        friendsAddBtn:                  'Добавить',
        friendsAcceptBtn:               'Принять',
        friendsDeclineBtn:              'Отклонить',
        friendsRemoveBtn:               'Удалить из друзей',
        friendsCancelBtn:               'Отменить заявку',
        friendsToastRequestSent:        'Заявка отправлена',
        friendsToastAccepted:           'Теперь вы друзья',
        friendsToastDeclined:           'Заявка отклонена',
        friendsToastRemoved:            'Удалено из друзей',
        friendProfileSincePrefix:       'с',
        friendProfileStreak:            '{count} {word} подряд',
        friendProfileQuotes:            '{count} {word}',
        friendProfileAchievements:      'Достижения',
        friendProfileQuotesTitle:       'Цитаты',
        friendProfileQuotesNotFriends:  'Цитаты видны только друзьям',
        friendProfileQuotesHidden:      '@{name} не показывает свои цитаты',
        friendProfileQuotesEmpty:       'Пока нет цитат',
        friendProfileQuotesMore:        'Показать ещё',
        friendQuoteSaveAria:            'Сохранить к себе',
        friendQuoteSavedLabel:          'Сохранено',
        friendQuoteSavedToast:          'Сохранено к себе',
        friendsErrorNotVisible:         'Эта цитата больше недоступна',
        friendsErrorSelf:               'Нельзя добавить себя в друзья',
        friendsErrorAlreadyFriends:     'Вы уже друзья',
        friendsErrorRequestSent:        'Заявка уже отправлена',
        friendsErrorRequestNotFound:    'Заявка не найдена',
        friendsErrorNotFound:           'Связь не найдена',

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
        authErrorEmailNotVerified:      'Email not verified. Confirm it to sign in.',
        authErrorEmailAlreadyRegistered:'This email is already registered',
        authErrorUserNotFound:          'User not found',
        resetLinkInvalid:               'The link is invalid or has expired',
        errBadRequest:                  'Bad request',
        errQuoteLimit:                  "You've reached your account quote limit",
        authGeoBlocked:                 'Google sign-in is unavailable in your region',
        authGeoBlockedYandex:           'Yandex sign-in is only available from Russia',
        authErrorInvalidEmailServer:    'Invalid email',
        authErrorConnection:            'Connection error',
        authErrorUsernameInvalid:       'Username: 3–20 characters, Latin letters, digits, and underscores',

        // Auth Email Verification ────────────────────────────────────────────────────────
        verifyTitle:            'Confirm your email',
        verifySubtitle:         'We sent a 6-digit code to {email}',
        verifyFromLoginNotice:  'This account isn\'t verified yet. We sent a code to {email} — enter it to sign in.',
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
        changePasswordSettingsDesc:       'Password for email sign-in.',
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
        avatarIconSnail:                  'Snail',
        avatarIconBee:                    'Bee',
        avatarIconFrog:                   'Frog',
        avatarIconNightingale:            'Nightingale',
        avatarPlusLocked:                 'Available in Epigraph Plus',

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
        ariaAccountMenu:                'Account menu',
        accountMenuPlus:                'Epigraph Plus',
        accountMenuPlusActive:          'active',
        accountMenuPlusBenefitsTitle:   'Included',
        accountMenuPlusBenefitLimit:    'Up to {limit} quotes',
        accountMenuPlusBenefitNoir:     'Exclusive Noir theme',
        accountMenuPlusBenefitAvatars:  'Exclusive avatars',
        accountMenuPlusBenefitStats:    'Advanced statistics',
        accountMenuLogout:              'Sign out',
        ariaScrollTop:                  'Scroll to top',
        ariaAchievementInfo:            'More info',
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
        ariaShare:                      'Share',
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
        addImportTabGoodreads:          'Goodreads',
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
        importErrorQuoteTooLong:        'Quote is longer than 1000 characters',
        importErrorAuthorTooLong:       'Author is longer than 100 characters',
        importErrorSourceTooLong:       'Source is longer than 200 characters',
        importErrorTagsTooLong:         'Tags are longer than 500 characters',
        importErrorGeneric:             'Failed validation',
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
        importYandexFaqA5:              'If your library has a lot of books (hundreds), the script can take a minute or two — it queries each book individually with a small pause between requests so it doesn\'t overload Yandex\'s server. Wait for the "DONE" message in the console before uploading the downloaded file.',

        // ── Yandex Books console script (messages the user reads in the browser console) ──
        yandexScriptPromptLogin:        'Enter your books.yandex.ru login (from your profile URL /@login):',
        yandexScriptNoLogin:            'No login provided, aborting.',
        yandexScriptLibraryError:       'Library error:',
        yandexScriptCollecting:         'Collecting the list of books...',
        yandexScriptFoundBooks:         'Books found:',
        yandexScriptBookError:          'Error for book',
        yandexScriptProcessed:          'Processed:',
        yandexScriptQuotesCollected:    'quotes collected:',
        yandexScriptDone:               'DONE. Total quotes:',

        // ── Import from Goodreads (TASK-138) ──────────────────────────────────
        importGoodreadsBenefit:         'Imports the quotes you liked on Goodreads (the "My Quotes" section of your profile). Worth it once you have a lot — moving them one by one takes ages.',
        importGoodreadsStep1Prefix:     'Open ',
        importGoodreadsStep1Suffix:     ' while logged in — that\'s your list of favorited quotes.',
        importGoodreadsStep2:           'Open the browser console (F12 → Console), paste the script and press Enter.',
        importGoodreadsCopyBtn:         'Copy script',
        importGoodreadsDesktopOnly:     'Desktop browser only — phones don\'t have the developer tools this method needs.',
        importGoodreadsStep3Prefix:     'The script downloads a ',
        importGoodreadsStep3Suffix:     ' file — upload it below like a regular JSON.',
        importGoodreadsUploadLabel:     'Upload the downloaded file',
        importGoodreadsFaqA2:           'The script runs only in your browser and only talks to goodreads.com under your own session. Epigraph never receives or stores your Goodreads password or cookies — only the quotes file you upload here yourself.',
        importGoodreadsFaqQ5:           'What exactly gets imported?',
        importGoodreadsFaqA5:           'The quotes from your "My Quotes" list on Goodreads — the ones you liked. Goodreads doesn\'t expose when you liked them, so imported quotes get the current date. Wait for the "DONE" message in the console before uploading the file.',

        // ── Goodreads console script (messages the user reads in the browser console) ──
        goodreadsScriptCollecting:      'Collecting quotes from Goodreads...',
        goodreadsScriptPage:            'Page',
        goodreadsScriptQuotesCollected: 'quotes collected:',
        goodreadsScriptDone:            'DONE. Total quotes:',
        goodreadsScriptNoQuotes:        'No quotes found. Make sure you are logged in to goodreads.com and your "My Quotes" list has liked quotes.',

        // ── Settings page (static markup) ───────────────────────────────────
        settingsTitle:                  'Settings',
        settingsAccountTitle:           'Account',
        settingsAccountEditAria:        'Change username',
        settingsAccountAvatarAria:      'Change icon',
        settingsLanguageTitle:          'Interface language',
        settingsLanguageDesc:           'Interface language.',
        settingsThemeTitle:             'Theme',
        settingsThemeDesc:              'Light and dark mode switch separately.',
        ariaChooseThemeStyle:           'Choose theme',
        themeStyleClassic:              'Classic',
        themeStyleForest:               'Forest',
        themeStyleCosmos:               'Cosmos',
        themeStyleOcean:                'Ocean',
        themeStyleSunset:               'Sunset',
        themeStyleNoir:                 'Noir',
        themeStylePlusHint:             'Epigraph Plus',
        redeemThanksTitle:              'Thank you for your support!',
        redeemThanksBody:               'Epigraph Plus is active. The exclusive Noir theme and other Plus features are now unlocked.',
        redeemApplyNoir:                'Apply Noir',
        redeemErrorInvalid:             'This code is invalid or has already been used',

        // ── Achievements (TASK-122) ──────────────────────────────────────────
        settingsAchievementsTitle:      'Achievements',
        settingsAchievementsDesc:       'Progress and rewards.',
        ariaOpenAchievements:           'Open achievements',
        achievementsOpenBtn:            'Open',
        achievementsSummary:            '{unlocked} of {total} unlocked',
        achievementsThemesSection:      'Themes',
        achievementsBadgesSection:      'Badges',
        achievementsStatsSection:       'Statistics',
        achievementsNearestThemesSection: 'Nearest achievements',
        achievementsCurrentBadge:       'Current badge',
        achievementsCurrentBadgeEmpty:  'Not earned yet',
        achievementsNextBadge:          'Next',
        achievementsShowAllBtn:         'All achievements ({total}) →',
        achievementsBackBtn:            '← Nearest',
        achievementsApplyThemeBtn:      'Apply theme',
        achievementsThemeAppliedToast:  'Theme applied',
        achievementsThemeErrorToast:    'Couldn\'t apply the theme',
        achievementFavorites25Title:    'Connoisseur',
        achievementFavorites25Desc:     '50 favorites',
        achievementAuthors10Title:      'Well-read',
        achievementAuthors10Desc:       '15 different authors added <b>manually</b>',
        achievementExplorerTitle:       'Explorer',
        achievementExplorerDesc:        'Add a quote, favorite one, import, switch theme, edit profile',
        achievementWeekStreakTitle:     'A week with Epigraph',
        achievementWeekStreakDesc:      '7 days of consecutive activity',
        achievementQuotes50Title:       'Fifty',
        achievementQuotes50Desc:        '50 quotes added',
        achievementQuoteDays10Title:    'Consistency',
        achievementQuoteDays10Desc:     'Quotes on 10 different days',
        achievementsImportHint:         'Quotes imported from a file don\'t count toward the "Well-read" achievement.',
        achievementsImportHintNovice:   'Quotes imported from a file don\'t count toward the "Novice" achievement.',
        badgeNoviceTitle:               'Novice',
        badgeNoviceDesc:                'Add your first quote <b>manually</b>',
        badgeChroniclerTitle:           'Chronicler',
        badgeChroniclerDesc:            '5 days active',
        badgeCollectorTitle:            'Collector',
        badgeCollectorDesc:             '15 days active',
        badgeBibliophileTitle:          'Seeker',
        badgeBibliophileDesc:           '30 days active',
        badgeKeeperTitle:               'Keeper',
        badgeKeeperDesc:                '60 days active',
        badgeInterpreterTitle:          'Interpreter',
        badgeInterpreterDesc:           '100 days active',
        badgeArchivistTitle:            'Archivist',
        badgeArchivistDesc:             '250 days active',
        badgeMentorTitle:               'Mentor',
        badgeMentorDesc:                '500 days active',
        badgeSageTitle:                 'Sage',
        badgeSageDesc:                  '1000 days active',
        achievementUnlockedHeading:     'Achievement unlocked',
        achievementUnlockedRewardTheme: 'Unlocked the "{theme}" theme',
        achievementUnlockedRewardBadge: 'New badge: {badge}',
        achievementUnlockedRewardStat:  'Unlocked the «{stat}» stat',
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
        settingsSupportTitle:           'Support the project',
        settingsSupportDesc:            'Unlock Epigraph Plus and support the project.',
        settingsSourceTitle:            'Source code',
        settingsSourceDesc:             'An open-source project on GitHub.',
        settingsContactTitle:           'Feedback',
        settingsContactDesc:            'Have a question or suggestion? Reach out to me.',
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
        pluralDay1:                     'day',
        pluralDay2:                     'days',
        pluralDay5:                     'days',
        pluralMonth1:                   'month',
        pluralMonth2:                   'months',
        pluralMonth5:                   'months',
        pluralWord1:                    'word',
        pluralWord2:                    'words',
        pluralWord5:                    'words',
        pluralPage1:                    'page',
        pluralPage2:                    'pages',
        pluralPage5:                    'pages',
        pluralMovie1:                   'movie',
        pluralMovie2:                   'movies',
        pluralMovie5:                   'movies',
        pluralEpisode1:                 'episode',
        pluralEpisode2:                 'episodes',
        pluralEpisode5:                 'episodes',
        pluralSong1:                    'song',
        pluralSong2:                    'songs',
        pluralSong5:                    'songs',
        pluralPair1:                    'pair',
        pluralPair2:                    'pairs',
        pluralPair5:                    'pairs',
        monthsGenitive:                 'January,February,March,April,May,June,July,August,September,October,November,December',
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

        // ── Share (public quote page, TASK-125) ───────────────────────────────
        shareBadge:                     'Public quote',
        sharePublicHint:                'This quote is public.\nView only.',
        shareAddButton:                 'Add to my collection',
        shareViewInCollection:          'View in my collection',
        shareCopyQuote:                 'Copy',
        shareLoginRequired:             'Sign in to add it',
        shareImportSuccess:             'Quote added to your collection',
        shareImportError:               'Couldn\'t add the quote',
        shareNotFoundTitle:             'Link not found',
        shareNotFoundText:              'This quote is no longer available.',
        notFoundTitle:                  'Page not found',
        notFoundText:                   'Looks like this page got lost between the quotes. No such page exists.',
        notFoundHomeBtn:                'Go home',
        shareOpenApp:                   'Open Epigraph',
        shareActionLabel:               'Share',
        shareLinkCopied:                'Link copied',
        shareLinkError:                 'Couldn\'t create the link',

        settingsQuotesVisibilityTitle:  'What friends see',
        settingsQuotesVisibilityDesc:   'People who aren\'t friends never see your quotes.',
        quotesVisibilityNone:           'Nothing',
        quotesVisibilityNoneDesc:       'Friends see none of your quotes',
        quotesVisibilityFavorites:      'Favourites only',
        quotesVisibilityFavoritesDesc:  'Friends see the quotes you starred',
        quotesVisibilityAll:            'All quotes',
        quotesVisibilityAllDesc:        'Friends see your whole collection',
        quotesVisibilitySaved:          'Setting saved',

        // ── Friends (TASK-129) ────────────────────────────────────────────────
        accountMenuFriends:             'Friends',
        accountMenuStats:               'Statistics',
        statsTitle:                     'Collection statistics',
        statsSubtitle:                  'Your collection in numbers',
        statsSectionOverview:           'Overview',
        statsTileQuotes:                'Quotes',
        statsTileAuthors:               'Authors',
        statsTileSources:               'Sources',
        statsTileTags:                  'Tags',
        statsDeltaAddedMonth:           '+{count} this month',
        statsDeltaNewAuthors:           '+{count} this month',
        statsTileSourcesHint:           'books, articles, films',
        statsTileTagsHint:              'topics & moods',
        statsHeroFavAuthor:             'Favorite author',
        statsHeroFavTag:                'Favorite tag',
        statsHeroAuthorMeta:            '{count} {word} · {fav} favorited',
        statsHeroTagMeta:               '{count} {word} · most frequent theme',
        statsHeroNoAuthorTitle:         'No authors yet',
        statsHeroNoAuthorMeta:          'Add an author to a quote',
        statsHeroNoTagTitle:            'No tags yet',
        statsHeroNoTagMeta:             'Add tags to your quotes',
        statsFavRingCenter:             'favorited',
        statsFavLegendFav:              '{count} favorited',
        statsFavLegendPlain:            '{count} regular',
        statsEmptyTitle:                'Nothing to show yet',
        statsEmptyText:                 'Add your first quote — your authors, themes and collection dynamics will appear here.',
        statsEmptyBtn:                  'Add a quote',
        statsChartTitle:                'Activity over 12 months',
        statsChartPeak:                 'Record: {count} in {month} {year}',
        statsTopAuthorsTitle:           'Top authors',
        statsTopTagsTitle:              'Top tags',
        statsNoData:                    'No data yet',
        statsAuthorsEmptyText:          'Add authors to your quotes',
        statsTagsEmptyText:             'Add tags to your quotes',
        statsMonthsShort:               'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
        statsMonthsPeak:                'January,February,March,April,May,June,July,August,September,October,November,December',
        statsSectionInteresting:        'Interesting',
        statsSectionMore:               'More analytics',
        statsCardGrowth:                'Collection growth',
        statsCardGrowthSub:             'Cumulative, all time',
        statsCardLength:                'Quote length',
        statsCardLengthSub:             'Short · medium · long',
        statsCardWordCloud:             'Word cloud',
        statsCardWordCloudSub:          'Frequent words across your quotes',
        statsWordsEmptyText:            'Add quotes with text to see your frequent words',
        statsCardComplexity:            'Language complexity',
        statsCardComplexitySub:         'Estimated from word and sentence length',
        statsComplexityLevels:          'Simple,Light,Medium,Fairly complex,Complex',
        statsComplexityReasons:         'short words, clear phrases|simple, not choppy|moderate text density|long words, elaborate phrases|dense, rich text',
        statsComplexityFactors:         'average word {word} · per sentence {sentence}',
        statsComplexityDisclaimer:      'A rough estimate, not a scientific index',
        statsComplexityEmptyText:       'Add quotes with text to gauge complexity',
        statsCardMood:                  'Collection mood',
        statsCardMoodSub:               'Tone of quotes by words · ≈ approx',
        statsMoodLight:                 'Light',
        statsMoodNeutral:               'Neutral',
        statsMoodDark:                  'Dark',
        statsMoodQuestions:             'Also: {pct} of quotes are questions, not statements.',
        statsMoodDisclaimer:            'Estimated from a word list, not meaning',
        statsMoodEmptyText:             'Add quotes with text to gauge mood',
        statsCardMilestones:            'Milestones & forecast',
        statsCardMilestonesSub:         'Collection pace and next milestones',
        statsMilePaceMonth:             '+{n} a month',
        statsMilePaceYear:              '+{n} a year',
        statsMileNow:                   'now',
        statsMonthsForecast:            'January,February,March,April,May,June,July,August,September,October,November,December',
        statsMileForecast:              'To {target} — by {date} at the current pace.',
        statsMileForecastSlow:          'Next milestone — {target}.',
        statsMileMax:                   'Every milestone reached — a record collection',
        statsMileAch:                   'Achievement “{title}” — {progress}/{threshold}.',
        statsMileEmptyText:             'Add quotes to see pace and milestones',
        statsCardReading:               'Reading time',
        statsCardReadingSub:            'How long to read everything',
        statsReadingHM:                 '{h} hr {m} min',
        statsReadingH:                  '{h} hr',
        statsReadingM:                  '{m} min',
        statsReadingMovies:             '≈ {n} {word}',
        statsReadingPodcast:            '≈ {n} podcast {word}',
        statsReadingSongs:              '≈ {n} {word}',
        statsReadingFlight:             '≈ a {route} flight',
        statsReadingTrips:              'London–Paris|80;Paris–Rome|125;Berlin–Madrid|180;London–Athens|230;London–Tenerife|275;Helsinki–Malaga|320',
        statsReadingEmptyText:          'Add quotes with text to estimate reading time',
        statsCardDup:                   'Hygiene: duplicates',
        statsCardDupSub:                'Similar and repeated quotes',
        statsDupExact:                  'exact copy',
        statsDupContained:              'extended version',
        statsDupSimilar:                '{pct}% similar',
        statsDupBadge:                  '{n} {word}',
        statsDupMore:                   '+ {n} more {word}',
        statsDupDismiss:                'not a duplicate',
        statsDupNoAuthor:               'no author',
        statsDupCleanTitle:             'No duplicates',
        statsDupCleanSub:               'all your quotes are unique',
        statsDupViewAll:                'Show in My quotes →',
        dupFilterChip:                  'Duplicates · {n}',
        statsLengthShort:               'short',
        statsLengthMedium:              'medium',
        statsLengthLong:                'long',
        statsCardBook:                  'Collection as a book',
        statsCardBookSub:               'Size in pages',
        statsBookPages:                 '≈ {count} {word}',
        statsBookWords:                 '{count} {word} · {frac} × {book}',
        statsBookCycleAria:             'Show another book',
        statsBookWarAndPeace:           'War and Peace',
        statsBookCrimePunishment:       'Crime and Punishment',
        statsBookPridePrejudice:        'Pride and Prejudice',
        statsBookNineteenEightyFour:    '1984',
        statsBookHarryPotter:           "Harry Potter and the Philosopher's Stone",
        statsCardLanguage:              'Collection language',
        statsCardLanguageSub:           'By the script of the text',
        statsLangRu:                    'Russian',
        statsLangEn:                    'English',
        statsLangOther:                 'Other',
        statsCardHall:                  'Hall of fame',
        statsCardHallSub:               'Record holders',
        statsHallFirst:                 'First quote',
        statsHallLongest:               'Longest',
        statsHallShortest:              'Shortest',
        statsHallBusiest:               'Best day',
        statsCardTempo:                 'Adding pace',
        statsCardTempoSub:              'Quotes added per quarter',
        statsQuarterLabel:              'Q{n}',
        statsMonthsFull:                'January,February,March,April,May,June,July,August,September,October,November,December',
        statsCardHeatmap:               'Activity',
        statsCardHeatmapSub:            'Days you visited',
        statsCalendarSub:               '{month} — days you visited',
        statsWeekdaysShort:             'Mo,Tu,We,Th,Fr,Sa,Su',
        statsWeekdaysFull:              'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
        statsHeatVisit:                 'visited',
        statsHeatQuote:                 'quote added',
        statsHeatToday:                 'today',
        statsRailStreak:                '{word} in a row',
        statsRailActive:                '{word} active',
        statsRailQuotes:                '{word} with a quote',
        statsCardSeasonality:           'Seasonality',
        statsCardSeasonalitySub:        'Which months you’re most active',
        statsCardAuthorLength:          'Quote length by author',
        statsCardAuthorLengthSub:       'Average words per quote',
        statsCardAuthorCloud:           'Author cloud',
        statsCardAuthorCloudSub:        'Size = quote count',
        statsCardAuthorScatter:         'Authors: depth × love',
        statsCardAuthorScatterSub:      'Quote count × favorite rate',
        statsScatterX:                  '→ more quotes',
        statsScatterY:                  '↑ more favorited',
        statsCardCommunity:             'You in the community',
        statsCardRhythm:                'Your rhythm',
        statsCardRhythmSub:             'When you collect quotes',
        statsCardCharacter:             'Quote character',
        statsCardCharacterSub:          'Questions, exclamations and other marks',
        statsSectionAchievement:        'Unlocked as your collection grows',
        statsLockedHint:                'Unlocks with the «{name}» achievement',
        statsRhythmPeakDay:             'most active',
        statsRhythmPeakTime:            'favorite time',
        statsTodNight:                  'Night',
        statsTodMorning:                'Morning',
        statsTodDay:                    'Day',
        statsTodEvening:                'Evening',
        statsCharQuestion:              'Questions',
        statsCharExclaim:               'Exclamations',
        statsCharEllipsis:              'Ellipses',
        statsCharNumber:                'With numbers',
        statsCommunitySub:              'How your collection compares to others',
        statsCommunityTopWord:          'Top',
        statsCommunityTopShort:         'top {pct}%',
        statsCommunityBiggerThan:       'bigger than {pct}% of readers',
        statsCommunityRowSize:          'Collection size',
        statsCommunityRowActivity:      'Activity this month',
        statsCommunityRowFav:           'Favorite share',
        statsCommunityLess:             'less',
        statsCommunityMore:             'more',
        statsCommunityYouCount:         'you · {count} {word}',
        statsCommunityLoading:          'Comparing with the community…',
        statsCommunityEarlyTitle:       'You’re among the first',
        statsCommunityEarlyText:        'The comparison appears once more readers join Epigraph.',
        statsPlusSectionTitle:          'Epigraph Plus',
        statsPlusTeaserTitle:           'Deeper analytics in Epigraph Plus',
        statsPlusTeaserCount:           'analytics in Epigraph Plus',
        statsPlusTeaserText:            'Heatmaps, sentiment, seasonality, community comparison and more charts',
        statsPlusFeatHeat:              'Activity heatmaps',
        statsPlusFeatMood:              'Sentiment & mood',
        statsPlusFeatSeason:            'Seasonality by month',
        statsPlusFeatCommunity:         'Community comparison',
        statsPlusTeaserCta:             'Explore Epigraph Plus',
        statsPlusInfoTitle:             'Epigraph Plus',
        statsPlusInfoBody:              'Subscribe and Epigraph opens up fully: deep collection analytics plus personalization.',
        statsPlusInfoPerkStats:         'Advanced statistics: activity heatmaps, sentiment, seasonality, community comparison',
        statsPlusInfoPerkTheme:         'Exclusive Noir theme & avatars',
        statsPlusInfoPerkBadge:         'Plus badge',
        statsPlusInfoPerkLimit:         'Higher collection limit: 1000 → 5000 quotes',
        statsPlusInfoHow:               'Core Epigraph stays free and ad-free. The subscription is arranged on Boosty — after payment you get a redeem code to activate.',
        statsPlusInfoSubscribe:         'Subscribe on Boosty',
        statsPlusInfoClose:             'Got it',
        statsFactStreakLabel:           'in a row in Epigraph',
        statsFactAvgLenLabel:           'characters — average quote length',
        statsFactSavedLabel:            'saved from friends',
        statsFactSourceLabel:           'quotes with a source',
        statsFactSingleAuthorsLabel:    'authors with a single quote',
        statsFactAgeLabel:              'collection age',
        statsAgeYearShort:              'y',
        statsAgeMonthShort:             'mo',
        statsAgeLessMonth:              '< 1 mo',
        friendsTitle:                   'Friends',
        friendsBackAria:                'Back',
        friendsSearchPlaceholder:       'Search by name',
        friendsSearchHint:              'Enter at least 2 characters',
        friendsSearchEmpty:             'No one found',
        friendsRequestsTitle:           'Requests',
        friendsOutgoingTitle:           'Sent requests',
        friendsListTitle:               'Your friends',
        friendsListEmpty:               'No one yet. Find friends by name above.',
        friendsAddBtn:                  'Add',
        friendsAcceptBtn:               'Accept',
        friendsDeclineBtn:              'Decline',
        friendsRemoveBtn:               'Remove friend',
        friendsCancelBtn:               'Cancel request',
        friendsToastRequestSent:        'Request sent',
        friendsToastAccepted:           'You are friends now',
        friendsToastDeclined:           'Request declined',
        friendsToastRemoved:            'Friend removed',
        friendProfileSincePrefix:       'since',
        friendProfileStreak:            '{count} {word} in a row',
        friendProfileQuotes:            '{count} {word}',
        friendProfileAchievements:      'Achievements',
        friendProfileQuotesTitle:       'Quotes',
        friendProfileQuotesNotFriends:  'Quotes are visible to friends only',
        friendProfileQuotesHidden:      '@{name} doesn\'t share their quotes',
        friendProfileQuotesEmpty:       'No quotes yet',
        friendProfileQuotesMore:        'Show more',
        friendQuoteSaveAria:            'Save to your collection',
        friendQuoteSavedLabel:          'Saved',
        friendQuoteSavedToast:          'Saved to your collection',
        friendsErrorNotVisible:         'This quote is no longer available',
        friendsErrorSelf:               'You can\'t add yourself',
        friendsErrorAlreadyFriends:     'You are already friends',
        friendsErrorRequestSent:        'A request has already been sent',
        friendsErrorRequestNotFound:    'Request not found',
        friendsErrorNotFound:           'Relationship not found',

        // ── General ───────────────────────────────────────────────────────────
        toastLoginRequired:             'Sign in to access this section',
        toastError:                     'Error',
    }
};

/**
 * Mirrors the active language into a cookie. localStorage stays the source of truth, but the
 * backend needs the language at the two moments it seeds a new account's onboarding quotes — the
 * /api/auth/verify POST and the OAuth provider callback redirect — and neither carries localStorage.
 * path=/ so it's sent on both endpoints; SameSite=Lax so it survives the top-level OAuth redirect
 * back to us. See AuthController.verify / OAuth2SuccessHandler on the backend.
 * @param {string} lang - 'ru' or 'en'.
 */
function writeLangCookie(lang) {
    try {
        document.cookie = `epigraph_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
    }
}

/** Currently active language code. */
let currentLanguage = localStorage.getItem('epigraph_lang') || 'ru';
document.documentElement.lang = currentLanguage;
// Keep the cookie in step with a language chosen in an earlier session (localStorage already set).
writeLangCookie(currentLanguage);

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
 * Same as quoteCountWord() but for "day(s)" — used by the activity streak
 * ("18 дней подряд"), which otherwise renders "1 дней" (TASK-129).
 * @param {number} n
 * @returns {string}
 */
function dayCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralDay1') : t('pluralDay2');
    }
    return pluralRu(n, t('pluralDay1'), t('pluralDay2'), t('pluralDay5'));
}

/**
 * Same as quoteCountWord() but for "month(s)" — used by the stats streak fact once a
 * daily streak passes a month ("5 месяцев подряд"). Russian has three forms.
 * @param {number} n
 * @returns {string}
 */
function monthCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralMonth1') : t('pluralMonth2');
    }
    return pluralRu(n, t('pluralMonth1'), t('pluralMonth2'), t('pluralMonth5'));
}

/**
 * Same as quoteCountWord() but for "word(s)" — used by the stats text metrics ("9 240 слов").
 * @param {number} n
 * @returns {string}
 */
function wordCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralWord1') : t('pluralWord2');
    }
    return pluralRu(n, t('pluralWord1'), t('pluralWord2'), t('pluralWord5'));
}

/**
 * Same as quoteCountWord() but for "page(s)" — used by the "collection as a book" stat.
 * @param {number} n
 * @returns {string}
 */
function pageCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralPage1') : t('pluralPage2');
    }
    return pluralRu(n, t('pluralPage1'), t('pluralPage2'), t('pluralPage5'));
}

/** "movie(s)" for the reading-time equivalents. */
function movieCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralMovie1') : t('pluralMovie2');
    }
    return pluralRu(n, t('pluralMovie1'), t('pluralMovie2'), t('pluralMovie5'));
}

/** "episode(s)" for the reading-time equivalents. */
function episodeCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralEpisode1') : t('pluralEpisode2');
    }
    return pluralRu(n, t('pluralEpisode1'), t('pluralEpisode2'), t('pluralEpisode5'));
}

/** "song(s)" for the reading-time equivalents. */
function songCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralSong1') : t('pluralSong2');
    }
    return pluralRu(n, t('pluralSong1'), t('pluralSong2'), t('pluralSong5'));
}

/** "pair(s)" for the duplicates card. */
function pairCountWord(n) {
    if (currentLanguage !== 'ru') {
        return n === 1 ? t('pluralPair1') : t('pluralPair2');
    }
    return pluralRu(n, t('pluralPair1'), t('pluralPair2'), t('pluralPair5'));
}

/**
 * Formats a timestamp as a "month year" label for the genitive case that
 * follows a preposition — "мая 2026", not toLocaleDateString's nominative
 * "май 2026 г.". English has no cases, so its list is just the plain names.
 * @param {number} timestamp - Unix millis.
 * @returns {string}
 */
function monthYearGenitive(timestamp) {
    const date = new Date(timestamp);
    const month = t('monthsGenitive').split(',')[date.getMonth()];

    return `${month} ${date.getFullYear()}`;
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
    writeLangCookie(lang);
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
 * Maps a backend error code (returned as the `message`/`error` value of an error response) to a
 * translation key. The backend is language-agnostic — it sends stable codes (see ApiCodes.java)
 * and the frontend localizes them here. Keep the code strings in sync with ApiCodes.java.
 *
 * Only codes actually surfaced through apiErrorMessage() need an entry — some errors (e.g.
 * THEME_LOCKED) are shown via a screen's own fixed toast and never go through this map.
 */
const ERROR_CODE_KEYS = {
    INVALID_CREDENTIALS:      'authErrorWrongCredentials',
    EMAIL_NOT_VERIFIED:       'authErrorEmailNotVerified',
    EMAIL_ALREADY_REGISTERED: 'authErrorEmailAlreadyRegistered',
    USER_NOT_FOUND:           'authErrorUserNotFound',
    INVALID_OR_EXPIRED_CODE:  'verifyErrorInvalidCode',
    RESET_LINK_INVALID:       'resetLinkInvalid',
    BAD_REQUEST:              'errBadRequest',
    QUOTE_LIMIT_EXCEEDED:     'errQuoteLimit',
    INVALID_OR_USED_CODE:     'redeemErrorInvalid',
    AVATAR_LOCKED:            'avatarPlusLocked',
    // Friends (TASK-129)
    CANNOT_FRIEND_SELF:       'friendsErrorSelf',
    ALREADY_FRIENDS:          'friendsErrorAlreadyFriends',
    REQUEST_ALREADY_SENT:     'friendsErrorRequestSent',
    FRIEND_REQUEST_NOT_FOUND: 'friendsErrorRequestNotFound',
    FRIENDSHIP_NOT_FOUND:     'friendsErrorNotFound',
    NOT_FRIENDS:              'friendsErrorNotVisible',
    // Quote bean-validation codes surfaced per-item in the import-rejected report.
    QUOTE_TOO_LONG:           'importErrorQuoteTooLong',
    AUTHOR_TOO_LONG:          'importErrorAuthorTooLong',
    SOURCE_TOO_LONG:          'importErrorSourceTooLong',
    TAGS_TOO_LONG:            'importErrorTagsTooLong',
};

/**
 * Translates a single backend code to its localized text, or the fallback key's text when the
 * code is unknown/absent. Never surfaces a raw backend string — display language always comes
 * from t(). Used for both top-level error bodies and per-field/per-item validation codes.
 *
 * @param {string|null|undefined} code - A backend code (e.g. from data.message or a field value).
 * @param {string} fallbackKey - Translation key to use when there's no recognized code.
 * @returns {string}
 */
function codeToText(code, fallbackKey) {
    if (code && ERROR_CODE_KEYS[code]) return t(ERROR_CODE_KEYS[code]);
    return t(fallbackKey);
}

/**
 * Resolves a user-facing error message from an API error body: if it carries a known backend
 * error code (as `message` or `error`), returns its localized translation; otherwise the fallback.
 *
 * @param {Object|null} data - Parsed error response body ({message}/{error} may hold a code).
 * @param {string} fallbackKey - Translation key to use when there's no recognized code.
 * @returns {string}
 */
function apiErrorMessage(data, fallbackKey) {
    return codeToText(data && (data.message || data.error), fallbackKey);
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

    // #sort-btn-label isn't [data-i18n] on purpose — its text tracks currentSort
    // (set by selectSort()/bootstrap.js's restore-on-load code), not the static
    // markup default. Re-sync it here so a later applyI18n() call (language
    // switch, settings re-render) can't reset it back to the "date_desc" default
    // while leaving the dropdown's checked item pointing at the real sort.
    const sortLabelEl = document.getElementById('sort-btn-label');
    if (sortLabelEl && typeof currentSort !== 'undefined' && typeof SORT_LABEL_KEYS !== 'undefined') {
        sortLabelEl.textContent = t(SORT_LABEL_KEYS[currentSort] || SORT_LABEL_KEYS.date_desc);
    }

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
