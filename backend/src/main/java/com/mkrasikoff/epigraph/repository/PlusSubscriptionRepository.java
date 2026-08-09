package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.PlusSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface PlusSubscriptionRepository extends JpaRepository<PlusSubscription, Long> {

    /**
     * The one row for a recurring subscription, looked up by its natural key so an incoming event
     * updates the existing row rather than inserting a duplicate. Empty on the first event.
     */
    Optional<PlusSubscription> findBySourceAndExternalId(String source, String externalId);

    /**
     * The furthest-out {@code current_period_end} among a user's rows in any of the given statuses —
     * the value {@link com.mkrasikoff.epigraph.model.User#getPlusUntil()} caches. Null when the user
     * has no matching row. Callers pass the "honored" statuses (active + canceled): a canceled
     * subscription still grants Plus until its paid-through date, so it counts toward the cache.
     */
    @Query("SELECT MAX(s.currentPeriodEnd) FROM PlusSubscription s " +
            "WHERE s.userId = :userId AND s.status IN :statuses")
    Long maxPeriodEndByStatuses(@Param("userId") Long userId, @Param("statuses") Collection<String> statuses);
}
