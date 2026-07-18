package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * A single-use Epigraph Plus redeem code (TASK-131). Codes are pre-generated into a pool and
 * handed out to supporters; redeeming one grants the account Plus. Once redeemed, {@code
 * redeemedByUserId} and {@code redeemedAt} are stamped and the code can never be used again.
 */
@Entity
@Table(name = "redeem_codes")
@Data
public class RedeemCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    /**
     * What the code unlocks — "plus" for now; leaves room for future code kinds.
     */
    @Column(nullable = false, length = 20)
    private String kind = "plus";

    /**
     * Account that redeemed this code, or null while unredeemed. A non-null value is what makes
     * the code single-use.
     */
    private Long redeemedByUserId;

    /**
     * Epoch millis of redemption, or null while unredeemed.
     */
    private Long redeemedAt;

    @Column(updatable = false)
    private Long createdAt;
}
