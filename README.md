# Epigraph

Epigraph is a personal app for collecting and keeping quotes you love — from books, articles, conversations, or anywhere else. Open it and see a quote of the day. Add new ones, mark favourites, search by author or keyword, and export your collection any time.

Your quotes are stored in a database and never lost between sessions.

## Live app

→ [epigraph.me](https://epigraph.me)

---

## For developers

### Project structure

```
epigraph/
├── backend/
│ ├── src/
│ │ └── main/
│ │ ├── java/com/mkrasikoff/epigraph/
│ │ │ ├── config/ — Security, JWT filter, OAuth2, Scheduler, MDC logging
│ │ │ ├── controller/ — AuthController, QuoteController, UserController, PushController
│ │ │ ├── dto/ — Data Transfer Objects
│ │ │ ├── exception/ — Exception handlers
│ │ │ ├── model/ — Quote, User, PushSubscription, EmailVerification
│ │ │ ├── repository/ — JPA repositories
│ │ │ ├── service/ — AuthService, QuoteService, UserService, EmailService, JwtService, PushNotificationService
│ │ │ └── EpigraphBackendApplication.java
│ │ └── resources/
│ │ ├── static/ — Frontend (index.html, styles.css, quotes.js, auth.js, api.js, ui.js, tags.js,
│ │ │             i18n.js, notifications.js, sw.js, avatars.js, bootstrap.js, state.js, swipe.js,
│ │ │             guest-quotes.js, yandex-import.js)
│ │ ├── db/ — Flyway migrations
│ │ ├── application.yaml
│ │ ├── application-local.yaml
│ │ └── application-prod.yaml
│ └── build.gradle.kts
├── README.md
├── RELEASE_POLICY.md
└── .gitignore
```

### Tech stack

| Layer         | Stack                                              |
|---------------|----------------------------------------------------|
| Backend       | Java 21, Spring Boot, Spring Security, JWT, OAuth2 |
| Frontend      | Vanilla JS, HTML/CSS (served as Spring static)     |
| Database      | PostgreSQL + Flyway (migrations)                   |
| Notifications | Web Push (VAPID)                                   |
| Deployment    | Railway                                            |

### Localization

The UI is bilingual (Russian/English). All user-facing strings live in `TRANSLATIONS` in
`static/i18n.js` (`TRANSLATIONS.ru` / `TRANSLATIONS.en`) and are looked up via `t('key')` — see the
`epigraph-conventions` skill for the conventions around adding new strings and switching language
at runtime.

### Requirements

| Tool       | Version                         |
|------------|---------------------------------|
| Java       | 21+                             |
| Gradle     | 8.14 (via wrapper, `./gradlew`) |
| PostgreSQL | 14+                             |

---

### Local development

#### 1. Database

Start **Postgres.app** (menubar icon → Start) and create the database:

```bash
psql -U postgres
CREATE DATABASE epigraph;
\q
```

#### 2. Backend + Frontend

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

The app starts at **http://localhost:8080** — frontend is included and served at the same address.

Verify the API is running:
```bash
curl http://localhost:8080/api/quotes
# Expected: [] (empty array — all good)
```

---

### Configuration

#### Local (`application-local.yaml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/epigraph
    username: postgres
    password: postgres
```

> This file is in `.gitignore` and is never committed.

#### Production (Railway environment variables)

| Variable                 | Value                        |
|--------------------------|------------------------------|
| `DATABASE_URL`           | set automatically by Railway |
| `DB_USER`                | set automatically by Railway |
| `DB_PASSWORD`            | set automatically by Railway |
| `SPRING_PROFILES_ACTIVE` | `prod`                       |

---

### API

Base URL: `http://localhost:8080/api`

#### Quotes

| Method   | Path             | Description           |
|----------|------------------|-----------------------|
| `GET`    | `/quotes`        | Get user quotes       |
| `POST`   | `/quotes`        | Add a quote           |
| `PUT`    | `/quotes/{id}`   | Update a quote        |
| `DELETE` | `/quotes/{id}`   | Delete a single quote |
| `DELETE` | `/quotes`        | Delete all quotes     |

#### Authentication

| Method | Path                           | Description                 |
|--------|--------------------------------|-----------------------------|
| `POST` | `/auth/register`               | Register a new account      |
| `POST` | `/auth/login`                  | Sign in with email/password |
| `GET`  | `/oauth2/authorization/google` | Sign in with Google         |

#### User

| Method   | Path       | Description              |
|----------|------------|--------------------------|
| `GET`    | `/user/me` | Get current user profile |
| `PUT`    | `/user/me` | Update profile           |
| `DELETE` | `/user/me` | Delete account           |

#### Quote object (JSON)

```json
{
  "id": 1,
  "text": "Quote text",
  "author": "Author name",
  "source": "Book title",
  "fav": false,
  "tags": "philosophy,motivation",
  "added": 1712760000000
}
```

---

### Quick start

```bash
cd backend && ./gradlew bootRun --args='--spring.profiles.active=local'
```

Open **http://localhost:8080**
