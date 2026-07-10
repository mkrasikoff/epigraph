--liquibase formatted sql
--changeset mkrasikoff:013-create-achievement-progress

-- One row per (user, achievement). The catalog of achievements themselves
-- lives in code (AchievementCatalog), not here — this table only tracks
-- whether/when a given user has satisfied a given achievement key.
-- unlocked_at is the sole source of truth for "does this user have this
-- privilege" — nothing re-derives it from raw counts at authorization time.
-- progress_detail holds a CSV of completed action keys for the "explorer"
-- achievement (e.g. "add_quote,favorite_quote") — same CSV-in-a-column
-- shape as Quote.tags, not a join table, since it's a small closed set.
CREATE TABLE IF NOT EXISTS achievement_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(40) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    progress_detail VARCHAR(200),
    unlocked_at BIGINT,
    UNIQUE (user_id, achievement_key)
);
