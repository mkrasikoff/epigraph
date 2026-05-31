package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.PushSubscriptionDto;
import com.mkrasikoff.epigraph.service.PushNotificationService;
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
class PushControllerTest {

    @Mock
    private PushNotificationService pushService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        PushController controller = new PushController(pushService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET /api/push/vapid-public-key: returns public key")
    void getVapidPublicKey_returnsKey() throws Exception {
        when(pushService.getVapidPublicKey()).thenReturn("VAPID_PUBLIC_KEY_VALUE");

        mockMvc.perform(get("/api/push/vapid-public-key"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.publicKey").value("VAPID_PUBLIC_KEY_VALUE"));

        verify(pushService).getVapidPublicKey();
    }

    @Test
    @DisplayName("POST /api/push/subscribe: returns 200 on success")
    void subscribe_returnsOk() throws Exception {
        PushSubscriptionDto dto = buildSubscriptionDto();

        doNothing().when(pushService).saveSubscription(isNull(), any(PushSubscriptionDto.class));

        mockMvc.perform(post("/api/push/subscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(pushService).saveSubscription(isNull(), any(PushSubscriptionDto.class));
    }

    @Test
    @DisplayName("DELETE /api/push/unsubscribe: returns 200 on success")
    void unsubscribe_returnsOk() throws Exception {
        doNothing().when(pushService).deleteSubscription(isNull(), eq("https://push.example.com/endpoint"));

        mockMvc.perform(delete("/api/push/unsubscribe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"endpoint\":\"https://push.example.com/endpoint\"}"))
                .andExpect(status().isOk());

        verify(pushService).deleteSubscription(isNull(), eq("https://push.example.com/endpoint"));
    }

    @Test
    @DisplayName("PUT /api/push/interval: returns 200 on success")
    void updateInterval_returnsOk() throws Exception {
        doNothing().when(pushService).updateInterval(isNull(), eq(6));

        mockMvc.perform(put("/api/push/interval")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"intervalHours\":6}"))
                .andExpect(status().isOk());

        verify(pushService).updateInterval(isNull(), eq(6));
    }

    private PushSubscriptionDto buildSubscriptionDto() {
        PushSubscriptionDto.Keys keys = new PushSubscriptionDto.Keys();
        keys.setP256dh("p256dh-value");
        keys.setAuth("auth-value");

        PushSubscriptionDto dto = new PushSubscriptionDto();
        dto.setEndpoint("https://push.example.com/endpoint");
        dto.setKeys(keys);
        dto.setIntervalHours(24);

        return dto;
    }
}
