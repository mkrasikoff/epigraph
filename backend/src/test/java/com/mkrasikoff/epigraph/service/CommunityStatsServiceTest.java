package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.CommunityStats;
import com.mkrasikoff.epigraph.repository.CommunityStatsRepository;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommunityStatsServiceTest {

    @Mock private QuoteRepository quoteRepository;
    @Mock private CommunityStatsRepository communityStatsRepository;
    @Captor private ArgumentCaptor<CommunityStats> snapshotCaptor;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private CommunityStatsService service;

    private static final long NOW = 1_700_000_000_000L;

    @BeforeEach
    void setUp() {
        service = new CommunityStatsService(quoteRepository, communityStatsRepository, objectMapper);
    }

    @Test
    @DisplayName("percentileThresholds: sorted, spans min..max, 101 buckets")
    void percentileThresholdsMonotonic() {
        int[] t = CommunityStatsService.percentileThresholds(new int[]{5, 1, 3, 2, 4});
        assertThat(t).hasSize(101);
        assertThat(t[0]).isEqualTo(1);      // 0th percentile → min
        assertThat(t[100]).isEqualTo(5);    // 100th percentile → max
        for (int p = 1; p < t.length; p++) {
            assertThat(t[p]).isGreaterThanOrEqualTo(t[p - 1]); // non-decreasing
        }
    }

    @Test
    @DisplayName("percentileThresholds: empty cohort → all zeros")
    void percentileThresholdsEmpty() {
        int[] t = CommunityStatsService.percentileThresholds(new int[]{});
        assertThat(t).hasSize(101).containsOnly(0);
    }

    @Test
    @DisplayName("recompute: writes cohort size and parseable percentile JSON, favPct derived per user")
    void recomputeBuildsSnapshot() {
        // Three users. Columns: [userId, total, recent, favs].
        List<Object[]> rows = List.of(
                new Object[]{10L, 100L, 8L, 50L},   // 100 quotes, 50% favourites
                new Object[]{20L, 10L, 0L, 0L},     // 10 quotes, 0% favourites
                new Object[]{30L, 40L, 40L, 10L}    // 40 quotes, 25% favourites
        );
        when(quoteRepository.aggregatePerUserStats(anyLong())).thenReturn(rows);
        when(communityStatsRepository.findById(CommunityStatsService.ROW_ID)).thenReturn(Optional.empty());

        service.recompute(NOW);

        verify(communityStatsRepository).save(snapshotCaptor.capture());
        CommunityStats saved = snapshotCaptor.getValue();
        assertThat(saved.getId()).isEqualTo(CommunityStatsService.ROW_ID);
        assertThat(saved.getUpdatedAt()).isEqualTo(NOW);
        assertThat(saved.getCohortSize()).isEqualTo(3);

        int[] sizeP = objectMapper.readValue(saved.getSizePercentiles(), int[].class);
        int[] favP = objectMapper.readValue(saved.getFavPctPercentiles(), int[].class);
        assertThat(sizeP).hasSize(101);
        assertThat(sizeP[0]).isEqualTo(10);   // smallest collection
        assertThat(sizeP[100]).isEqualTo(100); // largest collection
        assertThat(favP[0]).isEqualTo(0);     // lowest favourite share
        assertThat(favP[100]).isEqualTo(50);  // highest favourite share (50/100)
    }

    @Test
    @DisplayName("startup refresh: recomputes when the snapshot is missing")
    void startupRefreshWhenMissing() {
        when(communityStatsRepository.findById(CommunityStatsService.ROW_ID)).thenReturn(Optional.empty());
        when(quoteRepository.aggregatePerUserStats(anyLong())).thenReturn(List.of());

        service.refreshOnStartupIfStale();

        verify(communityStatsRepository).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("startup refresh: skips when the snapshot is fresh")
    void startupRefreshSkipsWhenFresh() {
        CommunityStats fresh = new CommunityStats();
        fresh.setId(CommunityStatsService.ROW_ID);
        fresh.setUpdatedAt(System.currentTimeMillis()); // built just now
        when(communityStatsRepository.findById(CommunityStatsService.ROW_ID)).thenReturn(Optional.of(fresh));

        service.refreshOnStartupIfStale();

        org.mockito.Mockito.verify(communityStatsRepository, org.mockito.Mockito.never())
                .save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("recompute: empty quotes table → cohort 0, no crash")
    void recomputeEmpty() {
        when(quoteRepository.aggregatePerUserStats(anyLong())).thenReturn(List.of());
        when(communityStatsRepository.findById(CommunityStatsService.ROW_ID)).thenReturn(Optional.empty());

        service.recompute(NOW);

        verify(communityStatsRepository).save(snapshotCaptor.capture());
        assertThat(snapshotCaptor.getValue().getCohortSize()).isEqualTo(0);
    }
}
