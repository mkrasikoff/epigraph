--liquibase formatted sql
--changeset mkrasikoff:018-create-redeem-codes

-- One row per Epigraph Plus redeem code (TASK-131). Codes are pre-generated into a
-- pool and handed out (manually, via Boosty for now). A code is single-use:
-- redeemed_by_user_id / redeemed_at stay NULL until activation, then are stamped and
-- the code can never be redeemed again. `kind` leaves room for future non-Plus codes.
-- redeemed_by_user_id goes NULL if the redeemer's account is deleted — the grant
-- already lives on users.plus_since, so the code just reads as "used, owner gone".
CREATE TABLE IF NOT EXISTS redeem_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    kind VARCHAR(20) NOT NULL DEFAULT 'plus',
    redeemed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at BIGINT,
    created_at BIGINT NOT NULL
);
