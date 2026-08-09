package com.mkrasikoff.epigraph.controller;

import tools.jackson.databind.ObjectMapper;
import com.mkrasikoff.epigraph.model.PlusSubscription;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import com.mkrasikoff.epigraph.service.PlusSubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatreonWebhookControllerTest {

    private static final String SECRET = "test-webhook-secret";
    private static final String MEMBER_ID = "member-123";
    private static final String EMAIL = "patron@example.com";

    @Mock private UserRepository userRepository;
    @Mock private PlusSubscriptionService plusSubscriptionService;

    private PatreonWebhookController controller;

    @BeforeEach
    void setUp() {
        controller = new PatreonWebhookController(
                new ObjectMapper(), userRepository, plusSubscriptionService, SECRET);
    }

    private byte[] activePledgeBody() {
        String json = """
                {
                  "data": {
                    "id": "%s",
                    "attributes": {
                      "patron_status": "active_patron",
                      "next_charge_date": "2026-09-01T00:00:00.000+00:00"
                    }
                  },
                  "included": [
                    { "type": "user", "attributes": { "email": "%s" } }
                  ]
                }""".formatted(MEMBER_ID, EMAIL);
        return json.getBytes(StandardCharsets.UTF_8);
    }

    private String sign(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacMD5");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacMD5"));
        return HexFormat.of().formatHex(mac.doFinal(body));
    }

    @Test
    @DisplayName("valid active-pledge webhook grants Plus until the next charge date")
    void validActivePledge_grantsActive() throws Exception {
        byte[] body = activePledgeBody();
        User user = new User();
        user.setId(42L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        long expectedEnd = OffsetDateTime.parse("2026-09-01T00:00:00.000+00:00").toInstant().toEpochMilli();

        ResponseEntity<Void> response =
                controller.handle(body, sign(body), "members:pledge:create");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(plusSubscriptionService).upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, MEMBER_ID, PlusSubscription.STATUS_ACTIVE, expectedEnd);
    }

    @Test
    @DisplayName("bad signature is rejected with 401 and touches nothing")
    void badSignature_returns401() {
        byte[] body = activePledgeBody();

        ResponseEntity<Void> response =
                controller.handle(body, "deadbeefdeadbeefdeadbeefdeadbeef", "members:pledge:create");

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(userRepository, plusSubscriptionService);
    }

    @Test
    @DisplayName("missing signature header is rejected with 401")
    void missingSignature_returns401() {
        byte[] body = activePledgeBody();

        ResponseEntity<Void> response = controller.handle(body, null, "members:pledge:create");

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(userRepository, plusSubscriptionService);
    }

    @Test
    @DisplayName("valid webhook for an unknown email is acknowledged (200) but grants nothing")
    void unmatchedEmail_acksWithoutGrant() throws Exception {
        byte[] body = activePledgeBody();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        ResponseEntity<Void> response =
                controller.handle(body, sign(body), "members:pledge:create");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(plusSubscriptionService, never()).upsertRecurring(any(), anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("pledge delete event marks the subscription canceled")
    void deleteEvent_marksCanceled() throws Exception {
        String json = """
                {
                  "data": {
                    "id": "%s",
                    "attributes": { "patron_status": "former_patron" }
                  },
                  "included": [
                    { "type": "user", "attributes": { "email": "%s" } }
                  ]
                }""".formatted(MEMBER_ID, EMAIL);
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        User user = new User();
        user.setId(42L);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        ResponseEntity<Void> response =
                controller.handle(body, sign(body), "members:pledge:delete");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // No next_charge_date in the payload → periodEnd 0 (keep existing, don't shorten).
        verify(plusSubscriptionService).upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, MEMBER_ID, PlusSubscription.STATUS_CANCELED, 0L);
    }
}
