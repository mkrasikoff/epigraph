package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.model.Quote;
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

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        QuoteController controller = new QuoteController(quoteService);
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
