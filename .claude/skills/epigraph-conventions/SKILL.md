---
name: epigraph-conventions
description: Conventions and hard-won gotchas for the Epigraph codebase (Spring Boot backend + vanilla-JS frontend, no build step). Use this whenever adding or editing a backend endpoint, adding a new user-editable field on User, touching any frontend static file (auth.js, ui.js, api.js, i18n.js, avatars.js, index.html, styles.css), or iterating on a UI/visual design change before writing real code. Trigger even if the user doesn't mention "skill" or "Epigraph" by name — any work under backend/src/main/java/com/mkrasikoff/epigraph or backend/src/main/resources qualifies.
---

# Epigraph conventions

Epigraph is a Spring Boot + vanilla-JS quote-collection app. There's no frontend build step —
`backend/src/main/resources/static/*` is served as-is. This skill captures patterns and gotchas
that came out of real tickets (TASK-51 username field, TASK-117 settings redesign, TASK-115
avatar picker) so they don't have to be rediscovered.

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

**All user-facing text goes through `i18n.js`.** Add the string to `TRANSLATIONS.ru` and call
`t('key')` — never hardcode Russian (or any language) directly in JS or inline HTML text nodes.
An English localization pass is planned, and every hardcoded string found then is a string that
has to be hunted down by hand instead of just needing a new `TRANSLATIONS.en` block. This applies
to dynamic *labels* too — e.g. avatar icon names live in `TRANSLATIONS.ru.avatarIcon*` and are
looked up via `avatarIconLabelKey(key)`, not hardcoded in `avatars.js`, because `avatars.js` also
holds the icon *keys* (`bear`, `cat`, ...) which must stay language-agnostic since they're shared
with the backend and CSS classes.

**`showModal(title, body, actions, wide)` resets its own state on every call — preserve that.**
Passing `''` as `title` hides the modal heading (toggles `display:none`), and the `wide` flag
toggles a `.modal--wide` class. Both are explicitly reset on *every* call (not just when true/
non-empty), because `#modal-title` and `.modal` are singleton DOM nodes shared by every modal in
the app. If a caller only set the hidden/wide state conditionally without resetting the "off"
case, the next unrelated modal to open would silently inherit whatever the previous modal left
behind. Keep this reset-every-call pattern when adding new per-modal variations to this shared
helper, rather than mutating it only in the "on" branch.

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
