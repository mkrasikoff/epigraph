package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.PlusSubscription;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.PlusSubscriptionRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlusSubscriptionServiceTest {

    @Mock private PlusSubscriptionRepository subscriptionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private PlusSubscriptionService plusSubscriptionService;

    private static final Long USER_ID = 7L;
    private static final String CODE = "PLUS-ABCDEFGHIJKLMNOPQRST";
    private static final long ONE_YEAR = 365L * 24 * 60 * 60 * 1000;
    private static final long TOLERANCE_MS = 5_000L;

    private User user() {
        User u = new User();
        u.setId(USER_ID);
        return u;
    }

    @Test
    @DisplayName("addStackingGrant: no prior entitlement — grant runs a full duration from now")
    void addStackingGrant_noActive_startsFromNow() {
        User user = user();
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList()))
                .thenReturn(null);
        long before = System.currentTimeMillis();

        plusSubscriptionService.addStackingGrant(user, PlusSubscription.SOURCE_BOOSTY_CODE, CODE, ONE_YEAR);

        PlusSubscription saved = savedSubscription();
        assertThat(saved.getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getSource()).isEqualTo(PlusSubscription.SOURCE_BOOSTY_CODE);
        assertThat(saved.getExternalId()).isEqualTo(CODE);
        assertThat(saved.getStatus()).isEqualTo(PlusSubscription.STATUS_ACTIVE);
        assertThat(saved.getCurrentPeriodEnd()).isCloseTo(before + ONE_YEAR, within(TOLERANCE_MS));
        // The cache mirrors the new grant's end.
        assertThat(user.getPlusUntil()).isEqualTo(saved.getCurrentPeriodEnd());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("addStackingGrant: active entitlement in the future — duration stacks on top of it")
    void addStackingGrant_activeInFuture_stacks() {
        User user = user();
        long existingEnd = System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000; // ~30 days left
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList()))
                .thenReturn(existingEnd);

        plusSubscriptionService.addStackingGrant(user, PlusSubscription.SOURCE_BOOSTY_CODE, CODE, ONE_YEAR);

        PlusSubscription saved = savedSubscription();
        assertThat(saved.getCurrentPeriodEnd()).isEqualTo(existingEnd + ONE_YEAR);
        assertThat(user.getPlusUntil()).isEqualTo(existingEnd + ONE_YEAR);
    }

    @Test
    @DisplayName("addStackingGrant: only-lapsed entitlement — grant restarts from now, not the past end")
    void addStackingGrant_activeButPast_startsFromNow() {
        User user = user();
        long lapsedEnd = System.currentTimeMillis() - 60L * 24 * 60 * 60 * 1000; // expired 60 days ago
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList()))
                .thenReturn(lapsedEnd);
        long before = System.currentTimeMillis();

        plusSubscriptionService.addStackingGrant(user, PlusSubscription.SOURCE_BOOSTY_CODE, CODE, ONE_YEAR);

        PlusSubscription saved = savedSubscription();
        assertThat(saved.getCurrentPeriodEnd()).isCloseTo(before + ONE_YEAR, within(TOLERANCE_MS));
        assertThat(user.getPlusUntil()).isEqualTo(saved.getCurrentPeriodEnd());
    }

    @Test
    @DisplayName("upsertRecurring: first event for a subscription — inserts a row and sets the cache")
    void upsertRecurring_new_insertsAndSetsCache() {
        User user = user();
        String memberId = "patreon-member-1";
        long periodEnd = System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000;
        when(subscriptionRepository.findBySourceAndExternalId(PlusSubscription.SOURCE_PATREON, memberId))
                .thenReturn(Optional.empty());
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList())).thenReturn(periodEnd);

        plusSubscriptionService.upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, memberId, PlusSubscription.STATUS_ACTIVE, periodEnd);

        PlusSubscription saved = savedSubscription();
        assertThat(saved.getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getSource()).isEqualTo(PlusSubscription.SOURCE_PATREON);
        assertThat(saved.getExternalId()).isEqualTo(memberId);
        assertThat(saved.getStatus()).isEqualTo(PlusSubscription.STATUS_ACTIVE);
        assertThat(saved.getCurrentPeriodEnd()).isEqualTo(periodEnd);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(user.getPlusUntil()).isEqualTo(periodEnd);
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("upsertRecurring: renewal event — updates the existing row in place, keeps created_at")
    void upsertRecurring_existing_updatesInPlace() {
        User user = user();
        String memberId = "patreon-member-1";
        long originalCreatedAt = 1_600_000_000_000L;
        long oldEnd = System.currentTimeMillis() + 5L * 24 * 60 * 60 * 1000;
        long renewedEnd = System.currentTimeMillis() + 35L * 24 * 60 * 60 * 1000;
        PlusSubscription existing = new PlusSubscription();
        existing.setUserId(USER_ID);
        existing.setSource(PlusSubscription.SOURCE_PATREON);
        existing.setExternalId(memberId);
        existing.setStatus(PlusSubscription.STATUS_ACTIVE);
        existing.setCurrentPeriodEnd(oldEnd);
        existing.setCreatedAt(originalCreatedAt);
        when(subscriptionRepository.findBySourceAndExternalId(PlusSubscription.SOURCE_PATREON, memberId))
                .thenReturn(Optional.of(existing));
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList())).thenReturn(renewedEnd);

        plusSubscriptionService.upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, memberId, PlusSubscription.STATUS_ACTIVE, renewedEnd);

        PlusSubscription saved = savedSubscription();
        assertThat(saved).isSameAs(existing); // updated in place, no duplicate row
        assertThat(saved.getCurrentPeriodEnd()).isEqualTo(renewedEnd);
        assertThat(saved.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(user.getPlusUntil()).isEqualTo(renewedEnd);
    }

    @Test
    @DisplayName("upsertRecurring: expiring the only subscription clears the cache to null")
    void upsertRecurring_expired_clearsCache() {
        User user = user();
        user.setPlusUntil(System.currentTimeMillis() + 1000); // had Plus before
        String memberId = "patreon-member-1";
        PlusSubscription existing = new PlusSubscription();
        existing.setUserId(USER_ID);
        existing.setSource(PlusSubscription.SOURCE_PATREON);
        existing.setExternalId(memberId);
        existing.setStatus(PlusSubscription.STATUS_ACTIVE);
        existing.setCurrentPeriodEnd(System.currentTimeMillis() + 3L * 24 * 60 * 60 * 1000);
        when(subscriptionRepository.findBySourceAndExternalId(PlusSubscription.SOURCE_PATREON, memberId))
                .thenReturn(Optional.of(existing));
        // No honored rows remain → recompute finds nothing.
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList())).thenReturn(null);

        plusSubscriptionService.upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, memberId, PlusSubscription.STATUS_EXPIRED,
                System.currentTimeMillis());

        assertThat(savedSubscription().getStatus()).isEqualTo(PlusSubscription.STATUS_EXPIRED);
        assertThat(user.getPlusUntil()).isNull();
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("upsertRecurring: an out-of-order event with an older date never shortens the period")
    void upsertRecurring_staleEvent_keepsFurthestDate() {
        User user = user();
        String memberId = "patreon-member-1";
        long currentEnd = System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000;
        long staleEnd = System.currentTimeMillis() + 2L * 24 * 60 * 60 * 1000; // an older, earlier date
        PlusSubscription existing = new PlusSubscription();
        existing.setUserId(USER_ID);
        existing.setSource(PlusSubscription.SOURCE_PATREON);
        existing.setExternalId(memberId);
        existing.setStatus(PlusSubscription.STATUS_ACTIVE);
        existing.setCurrentPeriodEnd(currentEnd);
        existing.setCreatedAt(1_600_000_000_000L);
        when(subscriptionRepository.findBySourceAndExternalId(PlusSubscription.SOURCE_PATREON, memberId))
                .thenReturn(Optional.of(existing));
        when(subscriptionRepository.maxPeriodEndByStatuses(eq(USER_ID), anyList())).thenReturn(currentEnd);

        plusSubscriptionService.upsertRecurring(
                user, PlusSubscription.SOURCE_PATREON, memberId, PlusSubscription.STATUS_ACTIVE, staleEnd);

        assertThat(savedSubscription().getCurrentPeriodEnd()).isEqualTo(currentEnd); // unchanged, not shortened
    }

    private PlusSubscription savedSubscription() {
        ArgumentCaptor<PlusSubscription> captor = ArgumentCaptor.forClass(PlusSubscription.class);
        verify(subscriptionRepository).save(captor.capture());
        return captor.getValue();
    }
}
