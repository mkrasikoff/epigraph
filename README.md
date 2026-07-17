# Epigraph

Epigraph is an app for collecting and keeping quotes you love — from books, articles,
conversations, or anywhere else. Open it and see a quote of the day. Add new ones, mark
favourites, search by author or keyword, earn achievements, and export your collection any time.
The interface is bilingual (Russian / English) and your quotes are stored server-side, so they
follow you across devices.

## Live app

→ **[epigraph.me](https://epigraph.me)**

---

## For developers

### Tech stack

| Layer         | Stack                                                              |
|---------------|--------------------------------------------------------------------|
| Backend       | Java 21, Spring Boot, Spring Security (JWT + OAuth2 Google/Yandex) |
| Frontend      | Vanilla JS + HTML/CSS, no build step (served as Spring static)     |
| Database      | PostgreSQL, Liquibase migrations                                   |
| Notifications | Web Push (VAPID)                                                   |
| Deployment    | Railway                                                            |

### Architecture

A single Spring Boot service that also serves the frontend — no separate web server or bundler.

- **Backend** — a conventional layered Spring app under `com.mkrasikoff.epigraph`:
  `controller` → `service` → `repository`, with `model` entities and feature-grouped `dto`
  packages. Cross-cutting concerns live in their own packages: `security` (JWT filter, OAuth2
  success handling), `geo` (region-based OAuth gating), `web` (request logging), and `config`.
  Achievements have their own small domain package. Schema changes are Liquibase changesets in
  `resources/db/postgres/`.
- **Frontend** — plain ES modules in `resources/static/`, each loaded via a `<script>` tag in
  `index.html` (no build step). All user-facing text goes through `i18n.js` (`t('key')`), so the
  UI stays fully bilingual.

> Repo-specific conventions and gotchas (adding an endpoint or a user field, the testing setup,
> frontend i18n discipline) are documented in the `epigraph-conventions` skill under
> `.claude/skills/`.

### API overview

Base URL: `/api`. All endpoints are JSON and, except auth and public share links, require a
`Bearer <jwt>` token.

- **Quotes** — list, create, update, delete, bulk import, and the deterministic quote-of-the-day.
- **Auth** — email registration with a verification code, login, Google/Yandex OAuth, and
  password reset by email link.
- **User** — profile (username, avatar, theme, language), password change, account deletion.
- **Sharing** — mint a public, view-only link for a quote and import a shared quote into your own
  collection.
- **Achievements & Push** — badge/theme progress, and Web Push quote-of-the-day opt-in.

---

### Requirements

| Tool       | Version                         |
|------------|---------------------------------|
| Java       | 21+                             |
| Gradle     | 8.14 (via wrapper, `./gradlew`) |
| PostgreSQL | 14+                             |

### Local development

**1. Database** — start Postgres and create the database:

```bash
psql -U postgres -c "CREATE DATABASE epigraph;"
```

**2. Backend + frontend** — one command runs both:

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

The app starts at **http://localhost:8080** — the frontend is served at the same address.
Liquibase applies migrations on startup. Verify the API:

```bash
curl http://localhost:8080/api/quotes   # → [] before you sign in
```

Local config lives in `application-local.yaml`, committed as a template: every secret is an
`${ENV_VAR}` placeholder, so no real credentials live in the repo. Supply them through environment
variables (or your IDE run configuration) when you need the external integrations — email delivery,
Web Push, and OAuth. The core quote features run without any of them.

### Production

Deployed on Railway with `SPRING_PROFILES_ACTIVE=prod`; the database URL and credentials are
injected as environment variables. Secrets are never committed — they are configured in the
hosting environment.

---

### Tests

```bash
cd backend && ./gradlew test
```
