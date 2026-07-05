--liquibase formatted sql
--changeset mkrasikoff:009-add-avatar-icon-to-users

-- Avatar icon chosen by the user from a fixed set of 12 presets (see
-- UpdateAvatarRequest for the allowed keys). Always has a value — defaults
-- to the neutral placeholder shown before the user picks one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_icon VARCHAR(20) NOT NULL DEFAULT 'neutral';
