--liquibase formatted sql
--changeset mkrasikoff:020-add-quotes-visibility-to-users

-- Who may see this user's quotes on their profile (TASK-129): 'none',
-- 'favorites' (only favourited ones) or 'all'. Only ever consulted for an
-- ACCEPTED friend — a non-friend sees nothing regardless of this value, so the
-- column controls *how much* a friend sees, not *whether* strangers can look.
--
-- Defaults to 'favorites', which also applies to every existing row: favourites
-- are the subset users already curate deliberately, so it is the closest thing
-- to a shelf they meant to show. Anyone who wants nothing shared can switch to
-- 'none' in Settings.
ALTER TABLE users ADD COLUMN IF NOT EXISTS quotes_visibility VARCHAR(20) NOT NULL DEFAULT 'favorites';
