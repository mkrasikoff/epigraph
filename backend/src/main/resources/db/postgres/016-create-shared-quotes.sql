--liquibase formatted sql
--changeset mkrasikoff:016-create-shared-quotes

-- One row per public share link. text/author/source/tags are a frozen snapshot
-- taken at share time — later edits to the source quote, or its deletion, never
-- change what the public link shows (source_quote_id going NULL on delete is
-- exactly that: the link keeps working off its own copy of the data).
-- The (owner_user_id, source_quote_id) unique constraint makes "Share" idempotent —
-- clicking it again on the same quote returns the existing link instead of a new one.
-- There is no revoked/active flag by design: once created, a link is permanent;
-- privacy comes only from the token being unguessable.
CREATE TABLE IF NOT EXISTS shared_quotes (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(32) NOT NULL UNIQUE,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_quote_id BIGINT REFERENCES quotes(id) ON DELETE SET NULL,
    text VARCHAR(3000) NOT NULL,
    author VARCHAR(255),
    source VARCHAR(500),
    tags VARCHAR(500),
    created_at BIGINT NOT NULL,
    UNIQUE (owner_user_id, source_quote_id)
);

-- Provenance on the importer's own copy: which shared link it came from, who
-- shared it, and when it was imported. shared_quote_id going NULL if the link's
-- owner account is deleted (cascaded via shared_quotes) doesn't affect the
-- imported quote itself — it's an independent copy, not a live reference.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shared_quote_id BIGINT
    REFERENCES shared_quotes(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shared_from_user_id BIGINT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS imported_at BIGINT;
