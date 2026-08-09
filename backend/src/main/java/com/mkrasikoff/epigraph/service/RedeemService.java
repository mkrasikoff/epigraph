package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.model.PlusSubscription;
import com.mkrasikoff.epigraph.model.RedeemCode;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.RedeemCodeRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * Epigraph Plus redeem codes (TASK-131): activation and pool upkeep.
 *
 * Codes are pre-generated into a pool and handed out to supporters. Redeeming one is single-use
 * (atomic claim) and extends the account's Plus entitlement by a year (TASK-141). The pool
 * self-refills: whenever it runs low it mints a fresh batch, both on startup and right after a
 * redemption.
 */
@Service
public class RedeemService {

    /** Refill the pool once fewer than this many unredeemed codes remain. */
    private static final int POOL_MIN = 10;
    /** How many codes to mint per refill. */
    private static final int POOL_BATCH = 100;

    /** How long one redeemed code grants Plus. Package-private so the test asserts against it. */
    static final long PLUS_DURATION_MILLIS = 365L * 24 * 60 * 60 * 1000;

    private static final String CODE_PREFIX = "PLUS-";
    private static final String CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // RFC 4648 base32
    private static final int CODE_BODY_LENGTH = 20;                                 // ~100 bits of entropy
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RedeemCodeRepository redeemCodeRepository;
    private final UserRepository userRepository;
    private final PlusSubscriptionService plusSubscriptionService;

    public RedeemService(RedeemCodeRepository redeemCodeRepository, UserRepository userRepository,
                         PlusSubscriptionService plusSubscriptionService) {
        this.redeemCodeRepository = redeemCodeRepository;
        this.userRepository = userRepository;
        this.plusSubscriptionService = plusSubscriptionService;
    }

    /**
     * Activates a redeem code for a user: claims it single-use and extends Plus by a year
     * (TASK-141). Extensions stack — if the account already has Plus running into the future, the
     * year is added on top of the remaining time; otherwise it runs a year from now. Refills the
     * pool if it's now low.
     *
     * @throws IllegalArgumentException {@code INVALID_OR_USED_CODE} if the code is unknown or already
     *                                  redeemed; {@code USER_NOT_FOUND} if the account is missing.
     */
    @Transactional
    public void redeem(Long userId, String code) {
        long now = System.currentTimeMillis();

        if (redeemCodeRepository.claim(code, userId, now) == 0) {
            throw new IllegalArgumentException(ApiCodes.INVALID_OR_USED_CODE);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        plusSubscriptionService.addStackingGrant(
                user, PlusSubscription.SOURCE_BOOSTY_CODE, code, PLUS_DURATION_MILLIS);

        ensurePool();
    }

    /**
     * Ensures the pool of unredeemed codes is stocked, minting a fresh batch when it runs low.
     * Runs once on startup and again after each redemption.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void ensurePool() {
        if (redeemCodeRepository.countByRedeemedAtIsNull() >= POOL_MIN) {
            return;
        }

        long now = System.currentTimeMillis();
        List<RedeemCode> batch = new ArrayList<>(POOL_BATCH);
        for (int i = 0; i < POOL_BATCH; i++) {
            RedeemCode rc = new RedeemCode();
            rc.setCode(generateCode());
            rc.setKind("plus");
            rc.setCreatedAt(now);
            batch.add(rc);
        }
        redeemCodeRepository.saveAll(batch);
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_PREFIX);
        for (int i = 0; i < CODE_BODY_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }
}
