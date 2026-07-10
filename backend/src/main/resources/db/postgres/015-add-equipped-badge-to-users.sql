--liquibase formatted sql
--changeset mkrasikoff:015-add-equipped-badge-to-users

-- Currently displayed badge key (see AchievementCatalog's badge ladder).
-- Not user-chosen — AchievementService always resets it to the highest
-- unlocked badge, so this is a cache of that resolution, not a preference.
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_badge VARCHAR(30);
