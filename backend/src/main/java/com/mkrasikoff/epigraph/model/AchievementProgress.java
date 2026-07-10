package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * One row per (user, achievement). The achievement catalog itself lives in
 * code (see AchievementCatalog) — this table only tracks whether/when a
 * given user has satisfied a given achievement key. unlockedAt is the sole
 * source of truth for "does this user have this privilege"; nothing
 * re-derives it from raw counts at authorization time.
 */
@Entity
@Table(name = "achievement_progress")
@Data
public class AchievementProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "achievement_key", nullable = false, length = 40)
    private String achievementKey;

    @Column(nullable = false)
    private int progress;

    /**
     * CSV of completed action keys, used only by the "explorer" achievement
     * (e.g. "add_quote,favorite_quote") — same CSV-in-a-column shape as
     * Quote.tags rather than a join table, since it's a small closed set.
     */
    @Column(name = "progress_detail", length = 200)
    private String progressDetail;

    @Column(name = "unlocked_at")
    private Long unlockedAt;
}
