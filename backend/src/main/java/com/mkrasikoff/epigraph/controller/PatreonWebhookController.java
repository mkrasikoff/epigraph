package com.mkrasikoff.epigraph.controller;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.mkrasikoff.epigraph.model.PlusSubscription;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import com.mkrasikoff.epigraph.service.PlusSubscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Receives Patreon membership webhooks and turns them into Epigraph Plus entitlements (TASK-141,
 * chunk 2). Patreon POSTs here on {@code members:pledge:create|update|delete}; we verify the
 * request really came from Patreon (HMAC-MD5 of the raw body against the webhook secret), map the
 * patron to an Epigraph account by email, and record the subscription via
 * {@link PlusSubscriptionService}. If the patron can't be matched (email doesn't line up) we simply
 * acknowledge and do nothing — the manual redeem-code path remains the fallback.
 *
 * <p><b>Payload fields to confirm against a real test event:</b> Patreon's webhook JSON is only
 * loosely documented; this reads the member id from {@code data.id}, the state from
 * {@code data.attributes.patron_status}, the paid-through date from
 * {@code data.attributes.next_charge_date}, and the email from the {@code included} user resource
 * (falling back to {@code data.attributes.email}). Trigger a test event from the developer portal
 * and verify these before relying on automation. A wrong guess degrades safely to "no auto-grant".
 */
@RestController
public class PatreonWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PatreonWebhookController.class);

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final PlusSubscriptionService plusSubscriptionService;
    private final String webhookSecret;

    public PatreonWebhookController(ObjectMapper objectMapper,
                                    UserRepository userRepository,
                                    PlusSubscriptionService plusSubscriptionService,
                                    @Value("${app.patreon.webhook-secret:}") String webhookSecret) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.plusSubscriptionService = plusSubscriptionService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/api/webhooks/patreon")
    public ResponseEntity<Void> handle(@RequestBody byte[] body,
                                       @RequestHeader(value = "X-Patreon-Signature", required = false) String signature,
                                       @RequestHeader(value = "X-Patreon-Event", required = false) String event) {
        if (!signatureValid(body, signature)) {
            log.warn("Rejected Patreon webhook: bad or missing signature (event={})", event);
            return ResponseEntity.status(401).build();
        }

        // TEMP (TASK-141): dump the raw payload once to confirm the email / next_charge_date field
        // locations against a real event, then remove. Test events carry obfuscated data, not real PII.
        log.info("Patreon webhook raw body (event={}): {}", event, new String(body, StandardCharsets.UTF_8));

        JsonNode root;
        try {
            root = objectMapper.readTree(body);
        } catch (Exception e) {
            log.warn("Rejected Patreon webhook: unparseable body (event={})", event);
            return ResponseEntity.badRequest().build();
        }

        JsonNode data = root.path("data");
        String memberId = text(data.get("id"));
        JsonNode attributes = data.path("attributes");
        String patronStatus = text(attributes.get("patron_status"));
        long periodEnd = parseEpochMillis(text(attributes.get("next_charge_date")));
        String email = patronEmail(root, attributes);

        if (memberId == null) {
            log.warn("Ignoring Patreon webhook without a member id (event={})", event);
            return ResponseEntity.ok().build();
        }

        String status = mapStatus(event, patronStatus);

        Optional<User> user = email == null ? Optional.empty() : userRepository.findByEmail(email);
        if (user.isEmpty()) {
            // Valid webhook, but no account we can attach it to — ack so Patreon stops retrying;
            // the supporter can still activate Plus with a manually issued code.
            log.info("Patreon webhook: no Epigraph account matched (member={}, event={})", memberId, event);
            return ResponseEntity.ok().build();
        }

        plusSubscriptionService.upsertRecurring(
                user.get(), PlusSubscription.SOURCE_PATREON, memberId, status, periodEnd);
        log.info("Patreon webhook applied: member={}, status={}, event={}", memberId, status, event);
        return ResponseEntity.ok().build();
    }

    /**
     * Maps a Patreon event/patron_status to one of our entitlement statuses. A cancellation or a
     * lapsed/declined patron becomes {@code canceled} — still honored until the paid-through date,
     * not revoked on the spot. Only an active patron is {@code active}.
     */
    private String mapStatus(String event, String patronStatus) {
        if (event != null && event.endsWith(":delete")) {
            return PlusSubscription.STATUS_CANCELED;
        }
        if ("active_patron".equals(patronStatus)) {
            return PlusSubscription.STATUS_ACTIVE;
        }
        return PlusSubscription.STATUS_CANCELED;
    }

    /** Email from the {@code included} user resource, falling back to the member's own attributes. */
    private String patronEmail(JsonNode root, JsonNode attributes) {
        for (JsonNode included : root.path("included")) {
            if ("user".equals(text(included.get("type")))) {
                String email = text(included.path("attributes").get("email"));
                if (email != null) {
                    return email;
                }
            }
        }
        return text(attributes.get("email"));
    }

    private boolean signatureValid(byte[] body, String signatureHeader) {
        if (webhookSecret == null || webhookSecret.isBlank() || signatureHeader == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacMD5");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacMD5"));
            String expected = HexFormat.of().formatHex(mac.doFinal(body));
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signatureHeader.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            return false;
        }
    }

    /** Parses an ISO-8601 timestamp to epoch millis, or 0 when absent/unparseable (no extension). */
    private long parseEpochMillis(String isoTimestamp) {
        if (isoTimestamp == null) {
            return 0L;
        }
        try {
            return OffsetDateTime.parse(isoTimestamp).toInstant().toEpochMilli();
        } catch (Exception e) {
            return 0L;
        }
    }

    private static String text(JsonNode node) {
        return node != null && node.isString() ? node.asString() : null;
    }
}
