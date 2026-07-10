package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.AchievementStatusResponse;
import com.mkrasikoff.epigraph.service.AchievementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Built with standaloneSetup — no springSecurity() — so
 * @AuthenticationPrincipal always resolves to null here, same gotcha as
 * AuthControllerTest/UserControllerTest. Stub with isNull(), not a real id.
 */
@ExtendWith(MockitoExtension.class)
class AchievementControllerTest {

    @Mock
    private AchievementService achievementService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AchievementController controller = new AchievementController(achievementService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/achievements/me: returns the achievement status list")
    void me_returnsStatusList() throws Exception {
        List<AchievementStatusResponse> statuses = List.of(
                new AchievementStatusResponse("authors_10", "distinct_authors", 10, 10, true, 1739310000000L, "theme", "forest"),
                new AchievementStatusResponse("week_streak", "active_days", 7, 3, false, null, "theme", "sunset")
        );
        when(achievementService.getStatusForUser(isNull())).thenReturn(statuses);

        mockMvc.perform(get("/api/achievements/me"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].key").value("authors_10"))
                .andExpect(jsonPath("$[0].unlocked").value(true))
                .andExpect(jsonPath("$[0].rewardKey").value("forest"))
                .andExpect(jsonPath("$[1].key").value("week_streak"))
                .andExpect(jsonPath("$[1].unlocked").value(false))
                .andExpect(jsonPath("$[1].progress").value(3));

        verify(achievementService).getStatusForUser(isNull());
    }

    @Test
    @DisplayName("POST /api/achievements/appearance-toggle: records change_theme and marks activity")
    void recordAppearanceToggle_recordsActionAndActivity() throws Exception {
        mockMvc.perform(post("/api/achievements/appearance-toggle"))
                .andExpect(status().isOk());

        verify(achievementService).recordAction(isNull(), eq("change_theme"));
        verify(achievementService).markActiveToday(isNull());
    }
}
