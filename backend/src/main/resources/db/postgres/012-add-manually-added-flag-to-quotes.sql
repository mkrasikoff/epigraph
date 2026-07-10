--liquibase formatted sql
--changeset mkrasikoff:012-add-manually-added-flag-to-quotes

-- True only for quotes created through the single "Add quote" form. Batch
-- imports (JSON/Yandex) and the 3 onboarding instruction quotes seeded at
-- registration always leave this false — achievement conditions that count
-- "content the user curated" (first_quote, badge day-thresholds' seed
-- condition) read only manually_added = true rows, so neither a bulk import
-- nor just registering an account can trivially satisfy them.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS manually_added BOOLEAN NOT NULL DEFAULT FALSE;
