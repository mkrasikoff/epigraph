package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.quote.BatchImportResult;
import com.mkrasikoff.epigraph.dto.quote.RejectedQuote;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.QuoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class QuoteControllerTest {

    @Mock
    private QuoteService quoteService;

    @Mock
    private AchievementService achievementService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        QuoteController controller = new QuoteController(quoteService, achievementService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    private Quote buildQuote(Long id, String text) {
        Quote q = new Quote();
        q.setId(id);
        q.setText(text);
        q.setAuthor("Author");
        q.setSource("Source");
        q.setTags("tag1,tag2");
        q.setFav(false);
        q.setUserId(1L);
        q.setAdded(123456789L);
        return q;
    }

    @Test
    @DisplayName("GET /api/quotes: returns user quotes")
    void getAll_returnsQuotes() throws Exception {
        List<Quote> quotes = List.of(
                buildQuote(1L, "First quote"),
                buildQuote(2L, "Second quote")
        );
        when(quoteService.findAll(isNull())).thenReturn(quotes);

        mockMvc.perform(get("/api/quotes"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].text").value("First quote"))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].text").value("Second quote"));

        verify(quoteService).findAll(isNull());
    }

    @Test
    @DisplayName("GET /api/quotes/qod: returns QOD when present")
    void getQod_returnsQuote() throws Exception {
        Quote qod = buildQuote(10L, "Quote of the day");
        when(quoteService.getQod(isNull())).thenReturn(Optional.of(qod));

        mockMvc.perform(get("/api/quotes/qod"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.text").value("Quote of the day"));

        verify(quoteService).getQod(isNull());
    }

    @Test
    @DisplayName("GET /api/quotes/qod: returns 204 when no QOD exists")
    void getQod_returnsNoContent_whenEmpty() throws Exception {
        when(quoteService.getQod(isNull())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/quotes/qod"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(quoteService).getQod(isNull());
    }

    @Test
    @DisplayName("POST /api/quotes: creates quote and returns 201")
    void create_returnsCreatedQuote() throws Exception {
        Quote incoming = buildQuote(null, "New quote");
        Quote saved = buildQuote(100L, "New quote");
        when(quoteService.save(any(Quote.class), isNull())).thenReturn(saved);

        mockMvc.perform(post("/api/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incoming)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.text").value("New quote"));

        verify(quoteService).save(any(Quote.class), isNull());
    }

    @Test
    @DisplayName("POST /api/quotes/batch: creates quotes and returns 201 with saved + rejected")
    void createBatch_returnsCreatedQuotes() throws Exception {
        List<Quote> incoming = List.of(buildQuote(null, "First"), buildQuote(null, "Second"));
        List<Quote> saved = List.of(buildQuote(100L, "First"), buildQuote(101L, "Second"));
        BatchImportResult result = new BatchImportResult(saved, List.of());
        when(quoteService.saveAll(any(), isNull())).thenReturn(result);

        mockMvc.perform(post("/api/quotes/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incoming)))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.saved.length()").value(2))
                .andExpect(jsonPath("$.saved[0].id").value(100))
                .andExpect(jsonPath("$.saved[1].id").value(101))
                .andExpect(jsonPath("$.rejected.length()").value(0));

        verify(quoteService).saveAll(any(), isNull());
    }

    @Test
    @DisplayName("POST /api/quotes/batch: reports rejected quotes with reasons")
    void createBatch_reportsRejectedQuotes() throws Exception {
        List<Quote> incoming = List.of(buildQuote(null, "Too long"));
        RejectedQuote rejectedQuote = new RejectedQuote(buildQuote(null, "Too long"), List.of("QUOTE_TOO_LONG"));
        BatchImportResult result = new BatchImportResult(List.of(), List.of(rejectedQuote));
        when(quoteService.saveAll(any(), isNull())).thenReturn(result);

        mockMvc.perform(post("/api/quotes/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incoming)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.saved.length()").value(0))
                .andExpect(jsonPath("$.rejected.length()").value(1))
                .andExpect(jsonPath("$.rejected[0].quote.text").value("Too long"))
                .andExpect(jsonPath("$.rejected[0].errors[0]").value("QUOTE_TOO_LONG"));
    }

    @Test
    @DisplayName("PUT /api/quotes/{id}: updates quote and returns updated object")
    void update_returnsUpdatedQuote() throws Exception {
        Quote incoming = buildQuote(1L, "Updated quote");
        incoming.setFav(true);
        Quote updated = buildQuote(1L, "Updated quote");
        updated.setFav(true);
        when(quoteService.update(eq(1L), any(Quote.class), isNull())).thenReturn(updated);

        mockMvc.perform(put("/api/quotes/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(incoming)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.text").value("Updated quote"))
                .andExpect(jsonPath("$.fav").value(true));

        verify(quoteService).update(eq(1L), any(Quote.class), isNull());
    }

    @Test
    @DisplayName("DELETE /api/quotes/{id}: returns 204")
    void delete_returnsNoContent() throws Exception {
        doNothing().when(quoteService).deleteById(1L, null);

        mockMvc.perform(delete("/api/quotes/1"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(quoteService).deleteById(1L, null);
    }

    @Test
    @DisplayName("DELETE /api/quotes: deletes all quotes and returns 204")
    void deleteAll_returnsNoContent() throws Exception {
        doNothing().when(quoteService).deleteAll(null);

        mockMvc.perform(delete("/api/quotes"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(quoteService).deleteAll(null);
    }
}
