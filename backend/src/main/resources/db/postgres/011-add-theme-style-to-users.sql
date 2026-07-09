--liquibase formatted sql
--changeset mkrasikoff:011-add-theme-style-to-users

-- Visual theme style chosen by the user from a fixed set of 5 presets (see
-- UpdateThemeStyleRequest for the allowed keys). Independent of light/dark
-- mode, which stays client-only. Always has a value — defaults to "classic"
-- until the user picks something else.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_style VARCHAR(20) NOT NULL DEFAULT 'classic';
