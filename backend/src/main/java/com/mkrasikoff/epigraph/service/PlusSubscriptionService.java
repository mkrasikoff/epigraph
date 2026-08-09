package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.PlusSubscription;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.PlusSubscriptionRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages Epigraph Plus entitlements in the plus_subscriptions table and keeps the derived
 * {@link User#getPlusUntil()} cache in sync (TASK-141). All grant/renewal paths (redeem codes;
 * Patreon; store IAP later) funnel through here so the cache has a single writer.
 */
@Service
public class PlusSubscriptionService {

    /**
     * Statuses that still grant Plus, so they feed the plus_until cache. A {@code canceled}
     * subscription counts until its paid-through {@code currentPeriodEnd} — cancelling stops renewal
     * but doesn't revoke the period already paid for. Only {@code expired} (refund / hard revoke)
     * drops out entirely.
     */
    private static final List<String> HONORED_STATUSES =
            List.of(PlusSubscription.STATUS_ACTIVE, PlusSubscription.STATUS_CANCELED);

    private final PlusSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    public PlusSubscriptionService(PlusSubscriptionRepository subscriptionRepository,
                                   UserRepository userRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
    }

    /**
     * Records a one-shot grant (a redeem code, a manual Boosty grant) that stacks a fixed duration on
     * top of the account's current entitlement, then refreshes the plus_until cache.
     *
     * <p>Stacking: the new period starts from whichever is later — now, or the furthest-out active
     * grant the user already has — so redeeming a second code adds another full {@code
     * durationMillis} on top of the remaining time rather than overlapping it. Because the new end is
     * therefore always the maximum, the cache is set to it directly (no recompute needed for a
     * monotonic grant — that's only required once a source can shorten entitlement, i.e. Patreon
     * cancellations in a later chunk).
     */
    @Transactional
    public void addStackingGrant(User user, String source, String externalId, long durationMillis) {
        long now = System.currentTimeMillis();
        Long currentMax = subscriptionRepository.maxPeriodEndByStatuses(user.getId(), HONORED_STATUSES);
        long base = (currentMax != null && currentMax > now) ? currentMax : now;
        long periodEnd = base + durationMillis;

        PlusSubscription subscription = new PlusSubscription();
        subscription.setUserId(user.getId());
        subscription.setSource(source);
        subscription.setExternalId(externalId);
        subscription.setStatus(PlusSubscription.STATUS_ACTIVE);
        subscription.setCurrentPeriodEnd(periodEnd);
        subscription.setCreatedAt(now);
        subscription.setUpdatedAt(now);
        subscriptionRepository.save(subscription);

        // The new grant's end is always the honored maximum, so set the cache directly.
        user.setPlusUntil(periodEnd);
        userRepository.save(user);
    }

    /**
     * Records the current state of a recurring subscription (Patreon now; store IAP later), keyed by
     * ({@code source}, {@code externalId}) so repeated events update one row instead of piling up.
     * Sets the paid-through {@code periodEnd} and {@code status}, then recomputes the plus_until
     * cache — which both extends Plus on renewal and lets it lapse once a subscription is no longer
     * honored and nothing else covers the user.
     *
     * @param status one of {@link PlusSubscription}'s {@code STATUS_*} — {@code active} on
     *               charge/renewal, {@code canceled} when it won't renew (still honored until
     *               {@code periodEnd}), {@code expired} to revoke outright.
     * @param periodEnd the paid-through instant reported by the event. The stored value only ever
     *               moves forward: webhooks can arrive out of order, and a cancellation must not
     *               claw back time the patron already paid for. Pass 0 to keep the existing date
     *               (e.g. a cancellation with no new date). To revoke early, use status
     *               {@code expired} — that drops the row out of the honored set regardless of date.
     */
    @Transactional
    public void upsertRecurring(User user, String source, String externalId, String status, long periodEnd) {
        long now = System.currentTimeMillis();
        PlusSubscription subscription = subscriptionRepository.findBySourceAndExternalId(source, externalId)
                .orElseGet(() -> {
                    PlusSubscription created = new PlusSubscription();
                    created.setUserId(user.getId());
                    created.setSource(source);
                    created.setExternalId(externalId);
                    created.setCreatedAt(now);
                    created.setCurrentPeriodEnd(0L);
                    return created;
                });
        subscription.setStatus(status);
        subscription.setCurrentPeriodEnd(Math.max(subscription.getCurrentPeriodEnd(), periodEnd));
        subscription.setUpdatedAt(now);
        subscriptionRepository.save(subscription);

        recompute(user);
    }

    /**
     * Refreshes the {@link User#getPlusUntil()} cache from the table = the furthest-out paid-through
     * date among the user's honored subscriptions, or null if none remain. Unlike a stacking grant
     * this can lower or clear plus_until, so it's the path used whenever a subscription is cancelled
     * or expires.
     */
    private void recompute(User user) {
        Long max = subscriptionRepository.maxPeriodEndByStatuses(user.getId(), HONORED_STATUSES);
        user.setPlusUntil(max);
        userRepository.save(user);
    }
}
