package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.ImportSharedQuoteResponse;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.model.SharedQuote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.SharedQuoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Uses standaloneSetup, so — per the repo-wide gotcha — @AuthenticationPrincipal
 * always resolves to null here regardless of what's stubbed. Every authenticated
 * endpoint is stubbed/verified with isNull(), never a real id.
 */
@ExtendWith(MockitoExtension.class)
class SharedQuoteControllerTest {

    @Mock
    private SharedQuoteService sharedQuoteService;

    @Mock
    private QuoteRepository quoteRepository;

    @Mock
    private AchievementService achievementService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        SharedQuoteController controller = new SharedQuoteController(sharedQuoteService, quoteRepository, achievementService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private SharedQuote buildSharedQuote() {
        SharedQuote s = new SharedQuote();
        s.setId(5L);
        s.setToken("tok123");
        s.setOwnerUserId(1L);
        s.setSourceQuoteId(10L);
        s.setText("Shared text");
        s.setAuthor("Author");
        s.setSource("Source");
        s.setTags("tag1,tag2");
        s.setCreatedAt(1000L);
        return s;
    }

    @Test
    @DisplayName("POST /api/quotes/{id}/share: returns the link token")
    void share_returnsToken() throws Exception {
        when(sharedQuoteService.createOrGetLink(10L, null)).thenReturn(buildSharedQuote());

        mockMvc.perform(post("/api/quotes/10/share"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.token").value("tok123"));

        verify(sharedQuoteService).createOrGetLink(10L, null);
    }

    @Test
    @DisplayName("GET /api/shared/{token}: returns public quote content with no auth required")
    void getShared_returnsPublicContent() throws Exception {
        when(sharedQuoteService.getPublic("tok123")).thenReturn(buildSharedQuote());

        mockMvc.perform(get("/api/shared/tok123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Shared text"))
                .andExpect(jsonPath("$.alreadyImported").value(false));

        verify(quoteRepository, org.mockito.Mockito.never()).existsBySharedQuoteIdAndUserId(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("POST /api/shared/{token}/import: creates a copy and returns 201")
    void importShared_returnsCreatedQuote() throws Exception {
        Quote imported = new Quote();
        imported.setId(100L);
        imported.setText("Shared text");
        when(sharedQuoteService.importToCollection("tok123", null))
                .thenReturn(new ImportSharedQuoteResponse(imported, false));

        mockMvc.perform(post("/api/shared/tok123/import"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.quote.id").value(100))
                .andExpect(jsonPath("$.alreadyImported").value(false));

        verify(achievementService).recordAction(isNull(), org.mockito.ArgumentMatchers.eq("import_quotes"));
        verify(achievementService).markActiveToday(isNull());
        verify(achievementService).evaluate(isNull());
    }

    @Test
    @DisplayName("POST /api/shared/{token}/import: already-imported repeat doesn't record achievements again")
    void importShared_alreadyImported_skipsAchievements() throws Exception {
        Quote imported = new Quote();
        imported.setId(100L);
        when(sharedQuoteService.importToCollection("tok123", null))
                .thenReturn(new ImportSharedQuoteResponse(imported, true));

        mockMvc.perform(post("/api/shared/tok123/import"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alreadyImported").value(true));

        verify(achievementService, org.mockito.Mockito.never()).recordAction(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
