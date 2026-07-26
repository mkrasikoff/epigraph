package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * The single-row community distribution snapshot (id is always 1), recomputed
 * nightly by {@link com.mkrasikoff.epigraph.service.CommunityStatsService}.
 * Holds aggregates only — never per-user data. Each *_percentiles field is a
 * JSON array of 101 integers (percentile 0..100) of the corresponding metric
 * across the cohort of users with at least one quote. See the 022 migration.
 */
@Entity
@Table(name = "community_stats")
@Data
public class CommunityStats {

    @Id
    private Long id;

    /** Epoch millis of the last successful recompute, or null before the first run. */
    @Column(name = "updated_at")
    private Long updatedAt;

    /** Number of users (with >= 1 quote) the snapshot was built from. */
    @Column(name = "cohort_size", nullable = false)
    private int cohortSize;

    /** JSON int[101]: collection-size (quote count) at each percentile. */
    @Column(name = "size_percentiles")
    private String sizePercentiles;

    /** JSON int[101]: quotes added in the trailing 30 days at each percentile. */
    @Column(name = "activity_percentiles")
    private String activityPercentiles;

    /** JSON int[101]: favourite share (0..100) at each percentile. */
    @Column(name = "fav_pct_percentiles")
    private String favPctPercentiles;
}
