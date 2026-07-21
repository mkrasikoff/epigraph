package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     *  null для OAuth-пользователей
     */
    @Column(length = 255)
    private String password;

    /**
     * "local", "google"
     */
    @Column(nullable = false, length = 50)
    private String provider;

    /**
     * ID из Google, если provider = "google"
     */
    @Column(length = 255)
    private String providerId;

    /**
     * Values for {@link #quotesVisibility}. Not a Java enum — this codebase
     * keeps closed sets as validated strings (see provider, themeStyle).
     */
    public static final String QUOTES_VISIBLE_NONE = "none";
    public static final String QUOTES_VISIBLE_FAVORITES = "favorites";
    public static final String QUOTES_VISIBLE_ALL = "all";

    @Column(updatable = false)
    private Long createdAt;

    /**
     * False until the user confirms their email address.
     * Google OAuth users are marked as verified immediately.
     */
    @Column(nullable = false)
    private boolean emailVerified = true;

    /**
     * Display name chosen by the user. Purely cosmetic — not unique, not used
     * as an identifier anywhere. Defaults to a name derived from the OAuth
     * provider (Google/Yandex) on first login, or is set explicitly at
     * registration for local accounts.
     */
    @Column(length = 20)
    private String username;

    /**
     * Avatar icon key chosen from a fixed set of 12 presets (see
     * UpdateAvatarRequest for the allowed keys). Always has a value —
     * "neutral" until the user picks something else.
     */
    @Column(nullable = false, length = 20)
    private String avatarIcon = "neutral";

    /**
     * Interface language ("ru" or "en"). Defaults to "ru"; updated when the
     * user switches languages in the UI, or seeded from the guest-selected
     * language at registration/login.
     */
    @Column(nullable = false, length = 5)
    private String preferredLanguage = "ru";

    /**
     * Visual theme style key chosen from a fixed set of 5 presets (see
     * UpdateThemeStyleRequest for the allowed keys). Independent of
     * light/dark mode. Always has a value — "classic" until the user picks
     * something else.
     */
    @Column(nullable = false, length = 20)
    private String themeStyle = "classic";

    /**
     * Currently displayed badge key (see AchievementCatalog's badge ladder).
     * Not user-chosen — AchievementService.evaluate() always resets it to
     * the highest badge the user has unlocked. Null until "Новичок" unlocks.
     */
    @Column(length = 30)
    private String equippedBadge;

    /**
     * Epoch millis of when the account was granted Epigraph Plus by redeeming a code
     * (see RedeemCode / TASK-131). Null until redeemed; permanent once set. A non-null
     * value is the single source of truth for "has Plus".
     */
    private Long plusSince;

    /**
     * How much of this user's collection an ACCEPTED friend may see (TASK-129) —
     * one of QUOTES_VISIBLE_*. Never grants access to a non-friend: the
     * friendship check comes first, this only narrows what a friend gets.
     */
    @Column(name = "quotes_visibility", nullable = false, length = 20)
    private String quotesVisibility = QUOTES_VISIBLE_FAVORITES;
}
