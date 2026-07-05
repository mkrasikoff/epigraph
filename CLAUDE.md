# Epigraph

Personal quote-collection app. Spring Boot (Java 21) backend, vanilla JS frontend with no build
step — `backend/src/main/resources/static/*` is served as-is. PostgreSQL + Liquibase migrations.
See [README.md](README.md) for the full project layout and local dev setup.

## Before doing backend or frontend work here

Read the `epigraph-conventions` skill first — it covers the exact recipe for adding a new
user-editable field/endpoint, a testing gotcha specific to this repo's MockMvc setup
(`@AuthenticationPrincipal` resolves to `null` in `AuthControllerTest`/`UserControllerTest`), the
frontend's plain-script load order and i18n discipline, and how to mock up UI changes with the
app's real color tokens before touching files.

## Workflow

- Always run `./gradlew :backend:test` after backend changes before considering the work done.
- All user-facing strings go through `i18n.js` (`TRANSLATIONS.ru` + `t()`) — an English
  localization pass is planned, so never hardcode display strings directly in JS/HTML.
- Don't commit or push unless explicitly asked — the user tests changes locally and commits
  themselves. When proposing a change, suggest a commit message in the TASK-NNN style seen in
  `git log`.
