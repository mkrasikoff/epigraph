--liquibase formatted sql
--changeset mkrasikoff:022-create-community-stats

-- A single-row snapshot of community-wide distributions, recomputed nightly by
-- CommunityStatsService (TASK-136, "Место в сообществе" Plus card). Deliberately
-- stores ONLY aggregates — no user_id, no per-user rows — so nothing here can be
-- traced back to an individual. Each *_percentiles column is a JSON array of 101
-- integers: element p is the value at the p-th percentile of that metric across
-- the cohort (users with >= 1 quote). The client finds its own standing by
-- looking up its locally-computed metric against these thresholds.
CREATE TABLE IF NOT EXISTS community_stats (
    id                   BIGINT PRIMARY KEY,
    updated_at           BIGINT,
    cohort_size          INTEGER NOT NULL DEFAULT 0,
    size_percentiles     TEXT,
    activity_percentiles TEXT,
    fav_pct_percentiles  TEXT
);

-- Seed the single row (id = 1) so the service can always update-in-place. Empty
-- until the first nightly refresh runs; the endpoint reports "not ready" while
-- cohort_size is below the minimum needed for a meaningful percentile.
INSERT INTO community_stats (id, cohort_size) VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;
