--liquibase formatted sql
--changeset mkrasikoff:021-add-imported-from-quote-id

-- Provenance for a quote saved from a friend's collection (TASK-129): the source
-- quote it was copied from. Distinct from shared_quote_id, which points at the
-- share-link table (016) — a friend import has no link. Enables two things: a
-- user can save a given friend quote at most once (dedup), and the friend's
-- profile can mark a quote already in your collection.
--
-- Goes NULL if the friend later deletes the original — the copy is independent
-- and keeps working, same rule as shared_quote_id.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS imported_from_quote_id BIGINT
    REFERENCES quotes(id) ON DELETE SET NULL;

-- Looked up on every friend-profile view (to mark saved quotes) and every save
-- (dedup), always scoped to one importer.
CREATE INDEX IF NOT EXISTS idx_quotes_imported_from ON quotes(user_id, imported_from_quote_id);
