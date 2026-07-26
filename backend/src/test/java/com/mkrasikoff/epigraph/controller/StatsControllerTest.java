package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.stats.CommunityStatsResponse;
import com.mkrasikoff.epigraph.service.CommunityStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class StatsControllerTest {

    @Mock
    private CommunityStatsService communityStatsService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        StatsController controller = new StatsController(communityStatsService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/stats/community returns the snapshot")
    void returnsSnapshot() throws Exception {
        when(communityStatsService.getSnapshot()).thenReturn(new CommunityStatsResponse(
                3, 1_700_000_000_000L,
                new int[]{10, 40, 100}, new int[]{0, 8, 40}, new int[]{0, 25, 50}));

        mockMvc.perform(get("/api/stats/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cohortSize").value(3))
                .andExpect(jsonPath("$.sizePercentiles[2]").value(100))
                .andExpect(jsonPath("$.favPctPercentiles[0]").value(0));
    }

    @Test
    @DisplayName("GET /api/stats/community reports an empty pre-refresh snapshot")
    void reportsEmptySnapshot() throws Exception {
        when(communityStatsService.getSnapshot()).thenReturn(new CommunityStatsResponse(
                0, null, new int[0], new int[0], new int[0]));

        mockMvc.perform(get("/api/stats/community"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cohortSize").value(0));
    }
}
