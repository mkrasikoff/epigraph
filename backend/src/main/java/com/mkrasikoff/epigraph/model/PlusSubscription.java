package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * One Epigraph Plus entitlement grant/subscription from a single source (TASK-141). This table is
 * the source of truth for "who has Plus and until when"; {@link User#getPlusUntil()} is a derived
 * cache = MAX({@code currentPeriodEnd}) over a user's active rows, refreshed by
 * PlusSubscriptionService on every write.
 *
 * <p>A redeem code adds one {@code boosty_code} row; recurring platforms (Patreon, Google Play,
 * Apple — later) upsert a single row per subscription keyed by ({@code source}, {@code externalId}).
 */
@Entity
@Table(name = "plus_subscriptions")
@Data
public class PlusSubscription {

    public static final String SOURCE_LEGACY = "legacy";
    public static final String SOURCE_BOOSTY_CODE = "boosty_code";
    public static final String SOURCE_PATREON = "patreon";

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_CANCELED = "canceled";
    public static final String STATUS_EXPIRED = "expired";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** Where the grant came from — one of the {@code SOURCE_*} constants. */
    @Column(nullable = false, length = 20)
    private String source;

    /**
     * Stable per-source key (the redeem code, a Patreon member id, a store purchase token…), or null
     * for sources with no natural id. Unique per source so an incoming event updates the right row.
     */
    @Column(length = 128)
    private String externalId;

    /** One of the {@code STATUS_*} constants. Only {@code active} rows feed the plus_until cache. */
    @Column(nullable = false, length = 20)
    private String status = STATUS_ACTIVE;

    /** Epoch millis this grant runs until. */
    @Column(nullable = false)
    private Long currentPeriodEnd;

    @Column(updatable = false)
    private Long createdAt;

    private Long updatedAt;
}
