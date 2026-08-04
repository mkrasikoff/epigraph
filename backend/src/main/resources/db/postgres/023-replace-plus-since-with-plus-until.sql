--liquibase formatted sql
--changeset mkrasikoff:023-replace-plus-since-with-plus-until

-- Epigraph Plus becomes time-bounded (TASK-141): store when the entitlement LAPSES rather than
-- when it was granted. plus_until = epoch millis of expiry; NULL or a past value = no Plus.
-- Redeem codes now extend this by a year instead of granting Plus forever (see RedeemService).
ALTER TABLE users ADD COLUMN IF NOT EXISTS plus_until BIGINT;

-- Carry existing Plus members over: everyone who currently has Plus (plus_since set) keeps it
-- through the end of 2026 (i.e. until the 2027-01-01 00:00 UTC instant).
UPDATE users
SET plus_until = (EXTRACT(EPOCH FROM TIMESTAMPTZ '2027-01-01 00:00:00+00') * 1000)::BIGINT
WHERE plus_since IS NOT NULL;

ALTER TABLE users DROP COLUMN IF EXISTS plus_since;
