package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.stats.CommunityStatsResponse;
import com.mkrasikoff.epigraph.model.CommunityStats;
import com.mkrasikoff.epigraph.repository.CommunityStatsRepository;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;

/**
 * Recomputes the single-row {@link CommunityStats} snapshot that backs the
 * "Место в сообществе" Plus card (TASK-136). Runs nightly over a single GROUP BY
 * of the quotes table, turning the per-user distribution of three metrics —
 * collection size, additions in the trailing 30 days, and favourite share — into
 * percentile-threshold arrays. Only these aggregates are persisted; no per-user
 * data leaves the loop, so the snapshot cannot be traced back to any individual.
 *
 * The client fetches the snapshot once and finds its own standing by looking up
 * its locally-computed metrics against the thresholds — mirroring how the rest of
 * the stats screen computes everything client-side.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CommunityStatsService {

    /** The snapshot is a single row, seeded with this id by the 022 migration. */
    static final long ROW_ID = 1L;

    /** Percentile thresholds cover 0..100 inclusive → 101 buckets. */
    static final int PERCENTILE_BUCKETS = 101;

    /** Trailing window (ms) that counts as "recent" for the activity metric — 30 days. */
    static final long RECENT_WINDOW_MS = 30L * 24 * 60 * 60 * 1000;

    /** A snapshot older than this (or never built) is refreshed on startup so we don't wait for 03:30. */
    static final long STALE_AFTER_MS = 24L * 60 * 60 * 1000;

    private final QuoteRepository quoteRepository;
    private final CommunityStatsRepository communityStatsRepository;
    private final ObjectMapper objectMapper;

    /** Nightly at 03:30 server time — off the top of the hour the push job uses. */
    @Scheduled(cron = "0 30 3 * * *")
    public void refresh() {
        try {
            recompute(System.currentTimeMillis());
        } catch (Exception e) {
            log.warn("Community stats refresh failed", e);
        }
    }

    /**
     * Builds the first snapshot on startup so the card works without waiting for the nightly
     * job — but only when the stored one is missing or stale, so frequent restarts don't
     * re-run the aggregation needlessly.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void refreshOnStartupIfStale() {
        try {
            long now = System.currentTimeMillis();
            CommunityStats cs = communityStatsRepository.findById(ROW_ID).orElse(null);
            if (cs == null || cs.getUpdatedAt() == null || now - cs.getUpdatedAt() > STALE_AFTER_MS) {
                recompute(now);
            }
        } catch (Exception e) {
            log.warn("Community stats startup refresh failed", e);
        }
    }

    /**
     * Rebuilds the snapshot from the current quotes. Package-visible and taking an
     * explicit {@code now} so tests can pin the recent-window cutoff.
     *
     * @param now epoch millis treated as "now" for the trailing-30-day window
     */
    @Transactional
    public void recompute(long now) {
        long cutoff = now - RECENT_WINDOW_MS;
        List<Object[]> rows = quoteRepository.aggregatePerUserStats(cutoff);
        int n = rows.size();

        int[] sizes = new int[n];
        int[] recents = new int[n];
        int[] favPcts = new int[n];
        for (int i = 0; i < n; i++) {
            Object[] r = rows.get(i);
            long total = ((Number) r[1]).longValue();
            long recent = r[2] == null ? 0 : ((Number) r[2]).longValue();
            long favs = r[3] == null ? 0 : ((Number) r[3]).longValue();
            sizes[i] = (int) total;
            recents[i] = (int) recent;
            favPcts[i] = total > 0 ? (int) Math.round(100.0 * favs / total) : 0;
        }

        CommunityStats cs = communityStatsRepository.findById(ROW_ID)
                .orElseGet(() -> {
                    CommunityStats fresh = new CommunityStats();
                    fresh.setId(ROW_ID);
                    return fresh;
                });
        cs.setUpdatedAt(now);
        cs.setCohortSize(n);
        cs.setSizePercentiles(toJson(percentileThresholds(sizes)));
        cs.setActivityPercentiles(toJson(percentileThresholds(recents)));
        cs.setFavPctPercentiles(toJson(percentileThresholds(favPcts)));
        communityStatsRepository.save(cs);

        log.info("Community stats recomputed: cohort={}", n);
    }

    /**
     * The 101 percentile thresholds of {@code values} (nearest-rank): element p is
     * the value at percentile p, so a client value >= threshold[p] ranks at or above
     * the p-th percentile. Empty input yields all zeros (the "not ready" case the
     * endpoint reports separately via cohortSize).
     */
    static int[] percentileThresholds(int[] values) {
        int[] out = new int[PERCENTILE_BUCKETS];
        if (values.length == 0) return out;
        int[] sorted = values.clone();
        Arrays.sort(sorted);
        for (int p = 0; p < PERCENTILE_BUCKETS; p++) {
            int idx = (int) Math.round((p / 100.0) * (sorted.length - 1));
            out[p] = sorted[idx];
        }
        return out;
    }

    private String toJson(int[] arr) {
        return objectMapper.writeValueAsString(arr);
    }

    /**
     * The current snapshot for the client. Reads the single row and parses its
     * stored percentile JSON back to arrays. Before the first refresh (or with an
     * empty cohort) returns cohortSize 0 and empty arrays, which the card treats
     * as "скоро".
     */
    @Transactional(readOnly = true)
    public CommunityStatsResponse getSnapshot() {
        CommunityStats cs = communityStatsRepository.findById(ROW_ID).orElse(null);
        if (cs == null) {
            return new CommunityStatsResponse(0, null, new int[0], new int[0], new int[0]);
        }
        return new CommunityStatsResponse(
                cs.getCohortSize(),
                cs.getUpdatedAt(),
                parseJson(cs.getSizePercentiles()),
                parseJson(cs.getActivityPercentiles()),
                parseJson(cs.getFavPctPercentiles())
        );
    }

    private int[] parseJson(String json) {
        if (json == null || json.isBlank()) return new int[0];
        try {
            return objectMapper.readValue(json, int[].class);
        } catch (Exception e) {
            return new int[0];
        }
    }
}
