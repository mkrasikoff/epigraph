package com.mkrasikoff.epigraph.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BannerControllerTest {

    private MockMvc mockMvc;
    private BannerController controller;

    @BeforeEach
    void setUp() {
        controller = new BannerController();
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/banner: returns message when set")
    void getBanner_returnsMessage() throws Exception {
        ReflectionTestUtils.setField(controller, "bannerMessage", "Ведутся технические работы.");

        mockMvc.perform(get("/api/banner"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").value("Ведутся технические работы."));
    }

    @Test
    @DisplayName("GET /api/banner: returns empty message when not configured")
    void getBanner_returnsEmptyMessage_whenNotConfigured() throws Exception {
        ReflectionTestUtils.setField(controller, "bannerMessage", "");

        mockMvc.perform(get("/api/banner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(""));
    }

    @Test
    @DisplayName("GET /api/banner: trims whitespace from message")
    void getBanner_trimsWhitespace() throws Exception {
        ReflectionTestUtils.setField(controller, "bannerMessage", "  Сообщение с пробелами  ");

        mockMvc.perform(get("/api/banner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Сообщение с пробелами"));
    }

    @Test
    @DisplayName("GET /api/banner: handles null message gracefully")
    void getBanner_handlesNull() throws Exception {
        ReflectionTestUtils.setField(controller, "bannerMessage", null);

        mockMvc.perform(get("/api/banner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(""));
    }
}
