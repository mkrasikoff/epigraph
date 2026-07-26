package com.mkrasikoff.epigraph.dto.stats;

/**
 * The community distribution snapshot the "Место в сообществе" Plus card reads
 * (TASK-136). Aggregates only. Each percentile array is 101 ints (percentile
 * 0..100); the client looks up its own locally-computed metric against these to
 * find its standing. Arrays are empty and cohortSize is 0 before the first
 * nightly refresh has a non-empty cohort — the client renders a "скоро" state then.
 *
 * @param cohortSize          users (with >= 1 quote) the snapshot was built from
 * @param updatedAt           epoch millis of the last recompute, or null
 * @param sizePercentiles     collection-size thresholds
 * @param activityPercentiles trailing-30-day additions thresholds
 * @param favPctPercentiles   favourite-share (0..100) thresholds
 */
public record CommunityStatsResponse(
        int cohortSize,
        Long updatedAt,
        int[] sizePercentiles,
        int[] activityPercentiles,
        int[] favPctPercentiles
) {
}
