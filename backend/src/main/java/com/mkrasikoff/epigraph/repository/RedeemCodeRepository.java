package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.RedeemCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RedeemCodeRepository extends JpaRepository<RedeemCode, Long> {

    Optional<RedeemCode> findByCode(String code);

    /** Count of codes still available to hand out — drives the pool auto-refill (see RedeemService). */
    long countByRedeemedAtIsNull();

    /**
     * Atomically claims an unredeemed code for a user. A single conditional UPDATE, so two
     * concurrent redemptions of the same code can't both succeed — the loser matches 0 rows.
     *
     * @return 1 if the code existed and was unredeemed (now claimed), 0 otherwise (missing or used).
     */
    @Modifying
    @Query("UPDATE RedeemCode r SET r.redeemedByUserId = :userId, r.redeemedAt = :now " +
            "WHERE r.code = :code AND r.redeemedAt IS NULL")
    int claim(@Param("code") String code, @Param("userId") Long userId, @Param("now") long now);
}
