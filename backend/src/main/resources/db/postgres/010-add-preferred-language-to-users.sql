--liquibase formatted sql
--changeset mkrasikoff:010-add-preferred-language-to-users

-- Interface language chosen by the user ("ru" or "en"). Always has a value —
-- defaults to "ru" until the user switches languages, or an explicit
-- guest-selected language is carried over at registration/login.
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'ru';
