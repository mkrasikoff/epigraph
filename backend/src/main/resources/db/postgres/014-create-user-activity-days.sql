--liquibase formatted sql
--changeset mkrasikoff:014-create-user-activity-days

-- One row per (user, calendar day) with real activity — upserted (INSERT ...
-- ON CONFLICT DO NOTHING) from AchievementService.markActiveToday(), never
-- from a page-load/GET request. Feeds both the week_streak achievement and
-- the day-threshold badge ladder off the same COUNT(*).
CREATE TABLE IF NOT EXISTS user_activity_days (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    UNIQUE (user_id, activity_date)
);
