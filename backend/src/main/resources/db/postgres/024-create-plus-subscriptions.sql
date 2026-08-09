--liquibase formatted sql
--changeset mkrasikoff:024-create-plus-subscriptions

-- Source-of-truth for Epigraph Plus entitlements (TASK-141, chunk 1). Each row is one grant or
-- subscription from some source (redeem code now; Patreon / Google Play / Apple later). The
-- users.plus_until column becomes a derived cache = MAX(current_period_end) over a user's active
-- rows, kept fresh by PlusSubscriptionService whenever a row changes.
CREATE TABLE IF NOT EXISTS plus_subscriptions (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Where the grant came from: 'boosty_code' | 'legacy' now; 'patreon' | 'google_play' | 'apple' later.
    source             VARCHAR(20) NOT NULL,
    -- Stable per-source key (redeem code, patreon member id, purchase token…). Nullable for sources
    -- that have no natural external id; unique per source so an event upserts the right row.
    external_id        VARCHAR(128),
    status             VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_end BIGINT      NOT NULL,
    created_at         BIGINT      NOT NULL,
    updated_at         BIGINT      NOT NULL,
    CONSTRAINT uq_plus_sub_source_external UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_plus_sub_user ON plus_subscriptions (user_id);

-- Backfill: mirror every account's current entitlement as a 'legacy' row, so plus_until is a
-- faithful derived cache from day one (existing grants predate this table and own no code/sub).
INSERT INTO plus_subscriptions (user_id, source, external_id, status, current_period_end, created_at, updated_at)
SELECT id,
       'legacy',
       'legacy-' || id,
       'active',
       plus_until,
       (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
       (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
FROM users
WHERE plus_until IS NOT NULL;
