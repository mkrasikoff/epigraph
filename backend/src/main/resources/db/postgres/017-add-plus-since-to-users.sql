--liquibase formatted sql
--changeset mkrasikoff:017-add-plus-since-to-users

-- Epigraph Plus entitlement (TASK-131): epoch-millis timestamp of when Plus was
-- granted by redeeming a code. NULL = no Plus. Permanent once set — a one-time
-- code grants Plus for good (see redeem_codes).
ALTER TABLE users ADD COLUMN IF NOT EXISTS plus_since BIGINT;
