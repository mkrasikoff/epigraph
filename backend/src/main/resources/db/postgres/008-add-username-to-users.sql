--liquibase formatted sql
--changeset mkrasikoff:008-add-username-to-users

-- Display name chosen by the user. Not unique — purely cosmetic, shown only
-- to the user themselves in Settings. The numeric `id` remains the real
-- identifier used everywhere else (JWT subject, foreign keys, etc.).
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(20);
