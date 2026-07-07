---
name: epigraph-conventions
description: Conventions and hard-won gotchas for the Epigraph codebase (Spring Boot backend + vanilla-JS frontend, no build step). Use this whenever adding or editing a backend endpoint, adding a new user-editable field on User, touching any frontend static file (auth.js, ui.js, api.js, i18n.js, avatars.js, index.html, styles.css), or iterating on a UI/visual design change before writing real code. Trigger even if the user doesn't mention "skill" or "Epigraph" by name — any work under backend/src/main/java/com/mkrasikoff/epigraph or backend/src/main/resources qualifies.
---

# Epigraph conventions

Epigraph is a Spring Boot + vanilla-JS quote-collection app. There's no frontend build step —
`backend/src/main/resources/static/*` is served as-is. This skill captures patterns and gotchas
that came out of real tickets (TASK-51 username field, TASK-117 settings redesign, TASK-115
avatar picker, TASK-118 English localization) so they don't have to be rediscovered.

## Always propose a commit message after edits

After finishing a round of edits — including a small follow-up fix mid-conversation, not just the
final wrap-up of a whole task — suggest a commit message in the `[TASK-NNN] ...` style seen in
`git log`, scoped to just that round's diff. This is already required by the top-level
`CLAUDE.md`, but it's easy to let slide once a task turns into many small back-and-forth rounds
(UI feedback, bug fixes, content corrections) — do it every time a round changes files, without
waiting to be asked.

## Adding a new user-editable field or endpoint

The username field and the avatarIcon field are the two precedents — mirror them exactly rather
than inventing a new shape. The reason to copy so closely: this backend has no enums and no
generic "settings" table, just one small field + one small DTO + one small endpoint per concept,
and keeping that consistent is what makes each addition trivial to review.

1. **Migration**: add `backend/src/main/resources/db/postgres/NNN-description.sql` (next sequential
   number — check the highest existing file first). No manual changelog edit needed;
   `db-changelog.yaml` uses `includeAll` and picks it up automatically.
2. **Entity field**: add it to `User.java` with a sensible Java-level default (e.g.
   `= "neutral"`) if the column is `NOT NULL DEFAULT ...` — this way `new User()` in tests and in
   `AuthService.register()`/`OAuth2SuccessHandler` already gets the right value without extra code.
3. **DTO**: new class in `dto/`, validated with `@NotBlank` + `@Pattern` (a whole-string regex
   alternation for closed sets like the avatar keys, or a shape regex for open text like
   username). Don't reach for a Java enum here — it's not this codebase's style, and the DTO
   pattern already gives clean 400s on invalid input via bean validation.
4. **Service method**: `UserService` method that does
   `findById(userId).orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"))`,
   sets the field, and saves. Keep the not-found message identical — controllers rely on catching
   `IllegalArgumentException` generically.
5. **Controller endpoint**: `PATCH /api/user/me/<thing>` in `UserController`, wrapping the service
   call in `try { ... return ResponseEntity.ok(new ErrorResponse("...обновлен..."))  } catch
   (IllegalArgumentException e) { return ResponseEntity.badRequest().body(new
   ErrorResponse(e.getMessage())); }`. `ErrorResponse` doubles as the success-message DTO here —
   that's intentional, not a bug.
6. **Expose it on `/me` if needed**: add the field to `MeResponse` and pass it in
   `AuthController.me()`.
7. **Tests**: for each of `UserServiceTest`, `UserControllerTest`, and (if `MeResponse` changed)
   `AuthControllerTest`, add tests shaped exactly like the username/avatar ones already there
   (success + save, throws when not found, validation edge cases). Then run
   `./gradlew :backend:test` before calling the backend work done — don't rely on
   `compileJava`/`compileTestJava` alone catching everything, see the gotcha below.

## Testing gotcha: `@AuthenticationPrincipal` is always null in these controller tests

`AuthControllerTest` and `UserControllerTest` build their `MockMvc` with
`MockMvcBuilders.standaloneSetup(controller).build()` — no `springSecurity()`. That means the
`AuthenticationPrincipal` argument resolver is never registered, so any
`@AuthenticationPrincipal Long userId` parameter resolves to `null` in every test in these two
classes, no matter what's stubbed elsewhere. This caused two real bugs already (tests stubbing
`userService.findById(42L)` while the controller actually called `findById(null)`, which threw a
`PotentialStubbingProblem` under strict Mockito).

When writing a new test in either file: stub the service call with `null` (or `isNull()` if using
argument matchers elsewhere in the same stub) as the userId argument — never a real id like `42L`
— unless you've separately verified the harness has changed to use `springSecurity()`.

Related: `AuthController.me()` needed an explicit `.<ResponseEntity<?>>map(...)` type witness on
the `Optional.map().orElseGet()` chain, because the two branches return different DTOs
(`MeResponse` vs `ErrorResponse`) and Java's inference otherwise locks onto the first branch's
type and fails to compile the second. If you add a similar `map/orElseGet` chain returning
different types per branch, you'll likely need the same fix.

## Frontend: plain scripts, no bundler

Every file in `backend/src/main/resources/static/` is loaded via a plain `<script src="...">` tag
in `index.html`, in a specific order — data-only modules (like `state.js`, `avatars.js`) need to
load before the modules that consume their globals (`auth.js`, `api.js`, `quotes.js`). When adding
a new static-data module, insert its `<script>` tag near modules with a similar "pure data, no
DOM dependency" shape (avatars.js sits right after `i18n.js` and before `api.js`).

**All user-facing text goes through `i18n.js`.** Add the string to both `TRANSLATIONS.ru` and
`TRANSLATIONS.en` (as of TASK-118 the app is bilingual — `TRANSLATIONS` is no longer ru-only) and
call `t('key')` — never hardcode a language directly in JS or inline HTML text nodes. This applies
to dynamic *labels* too — e.g. avatar icon names live in `TRANSLATIONS.*.avatarIcon*` and are
looked up via `avatarIconLabelKey(key)`, not hardcoded in `avatars.js`, because `avatars.js` also
holds the icon *keys* (`bear`, `cat`, ...) which must stay language-agnostic since they're shared
with the backend and CSS classes. Preset/decorative content that's genuinely user-content-like
(the sample quotes in `GUEST_QUOTES`) is the one deliberate exception — see below.

**Wiring `t()` into the screen you're touching isn't enough — hardcoded strings hide in places
that don't look like "the feature."** TASK-118 turned up several: JS-built modal markup
(`quotes.js`'s edit-quote modal built its field labels as raw Russian template-literal text, not
`t()` calls), a dynamically-set `aria-label` in the theme toggle (`ui.js` called `setAttribute`
with a literal string per theme instead of going through `data-i18n-aria`), `toLocaleDateString
('ru-RU', ...)` hardcoded regardless of the active language, and prose with embedded inline markup
that plain `data-i18n` textContent assignment would have destroyed (now handled by
`data-i18n-html`, below). Before calling any i18n-adjacent task done, grep the touched files (and
realistically `static/*.js` + `index.html` as a whole) for Cyrillic that isn't inside a `t('key')`
call or the fallback text of a `data-i18n*` attribute — e.g.
`grep -nP '[Ѐ-ӿ]' file.js | grep -vP "t\('[a-zA-Z0-9]+'"`. Static-markup fallback text (the Russian
between `data-i18n="key"` tags, shown only before JS runs) is fine — `applyI18n()` overwrites it;
the bug is Cyrillic with *no* `data-i18n*` attribute on the enclosing element, or Cyrillic inside a
JS string.

**`data-i18n-html="key"`** is a 5th `applyI18n()` attribute (alongside `data-i18n`,
`data-i18n-placeholder`, `data-i18n-aria`, `data-i18n-title`) for strings that need embedded inline
HTML — it sets `el.innerHTML` instead of `el.textContent`. Use it instead of splitting a sentence
across multiple `data-i18n` spans whenever the markup is inline (e.g. `Upload a
<code>.json</code> file`).

**Script order only matters for code that runs immediately at load time.** A `<script>` loaded
later in `index.html` can still be referenced safely by an earlier-loaded file's *function bodies*
(event handlers, functions called from `bootstrap.js` after the whole page has loaded) — order
only breaks things for top-level statements that execute the instant the script parses (IIFEs,
`let x = localStorage.getItem(...)` initializers, etc.). Don't assume a forward-reference is a bug
without checking whether it's inside a function.

**`showModal(title, body, actions, wide)` resets its own state on every call — preserve that.**
Passing `''` as `title` hides the modal heading (toggles `display:none`), and the `wide` flag
toggles a `.modal--wide` class. Both are explicitly reset on *every* call (not just when true/
non-empty), because `#modal-title` and `.modal` are singleton DOM nodes shared by every modal in
the app. If a caller only set the hidden/wide state conditionally without resetting the "off"
case, the next unrelated modal to open would silently inherit whatever the previous modal left
behind. Keep this reset-every-call pattern when adding new per-modal variations to this shared
helper, rather than mutating it only in the "on" branch.

## Two toggle components — pick the right one

`.toggle-switch` (round iOS-style knob) is for a single boolean the user flips in place with no
other visible option — e.g. the Quote-of-the-day push notification opt-in. `.import-source-toggle`
/ `.import-source-tab` (segmented pill, originally built for the JSON vs. Yandex.Books import
source picker) is for an explicit 2-option choice where both options should stay visible at once —
used for the RU/EN language switcher, and — per an explicit design call in TASK-118 — also swapped
in for the Quote-of-the-day toggle in Settings so it visually matches the language switcher sitting
right above it in the same group. When adding a new binary control to a `.settings-item` row, check
whether it sits next to another 2-option control it should visually match before defaulting to the
round switch.

**`#app-loading-overlay` is a reusable "artificial loading" primitive, not just the boot spinner.**
`ui.js`'s language toggle reuses it (`classList.remove('hidden')` / `.add('hidden')`) to mask a
change that would otherwise cause a visible layout jump — e.g. English text reflowing shorter than
Russian mid-interaction. Reach for it before building a bespoke spinner whenever a change needs a
deliberate "beat" before the UI updates.

## Carrying a guest-chosen preference into an account at signup/login

Some preferences (e.g. `preferredLanguage`) need to work for guests with no account yet *and*
persist once they sign up or log in, without a jarring reset back to whatever the account's stored
default happens to be. The pattern from TASK-118 (`syncPreferredLanguage()` in `auth.js`):
`localStorage` is the source of truth pre-auth; right after a successful login/register/reset —
before the first render that depends on the preference — compare the raw `localStorage` value
against the server's stored value. If `localStorage` has an *explicit* value (the guest actually
touched it, distinguishable from "never set" via `localStorage.getItem(key) !== null`, not just the
in-memory fallback default) that differs from the server's, push it up via `PATCH`; otherwise pull
the server's value down and apply it locally. This lets a guest's in-session choice "win" and become
the account's setting, while still giving genuine cross-device continuity when the local device has
no prior choice. Reuse this shape for any future preference with the same guest-then-account
lifecycle — don't just always pull from the server on login, which would silently discard whatever
the guest just picked.

## Verify attributed sample content before adding it

`GUEST_QUOTES` (and any other decorative/sample content attributed to a real historical person)
should be fact-checked, not just translated or typed up from memory. Translating TASK-118's
Russian `GUEST_QUOTES` to English and checking sources turned up 4 popularly-circulated but
misattributed "quotes" already in the Russian set (wrong author, or fabricated entirely) —
many famous-sounding quotes attributed to Twain, da Vinci, Confucius, etc. are folklore, not
verified. Search before trusting an attribution, especially for anything more specific than a
well-known proverb.

## Design iteration: mock up with real color tokens before touching files

For any visible UI/CSS change, use `mcp__visualize__show_widget` to mock it up first — with the
app's *actual* dark-theme hex values pulled from `styles.css` (`:root`/`[data-theme="dark"]`),
not generic light-UI-kit colors. A mockup in the wrong palette gets rejected for looking "off" for
reasons that have nothing to do with the actual design idea being tested, which wastes a round
trip. Current dark-theme tokens (grab fresh ones from `styles.css` if this drifts):

| Token                                              | Hex                   | Use                                            |
|----------------------------------------------------|-----------------------|------------------------------------------------|
| `--color-bg`                                       | `#18160f`             | page background                                |
| `--color-surface`                                  | `#1e1c15`             | cards                                          |
| `--color-divider`                                  | `#2e2b22`             | hairlines                                      |
| `--color-border`                                   | `#3a3729`             | button borders                                 |
| `--color-text`                                     | `#e8e3d8`             | primary text                                   |
| `--color-text-muted`                               | `#8a8272`             | secondary text                                 |
| `--color-text-faint`                               | `#5a5446`             | tertiary/id/hint text                          |
| `--color-primary`                                  | `#d4956a`             | accent                                         |
| `--color-primary-highlight`                        | `#3a2d22`             | accent-tinted backgrounds (avatar badges etc.) |
| `--color-accent`                                   | `#c8956c`             | secondary accent                               |
| `--color-primary-hover` / `--color-primary-active` | `#e8a87a` / `#f0b888` | lighter accent steps                           |

Iterate in the mockup based on feedback until the user confirms a direction, *then* port the
confirmed version into the real HTML/CSS/JS files. Don't implement speculative variants directly
in the codebase — that's what the mockup loop is for.
