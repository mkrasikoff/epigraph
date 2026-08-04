package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.RedeemCode;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.RedeemCodeRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedeemServiceTest {

    @Mock private RedeemCodeRepository redeemCodeRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private RedeemService redeemService;

    private static final Long USER_ID = 1L;
    private static final String CODE = "PLUS-ABCDEFGHIJKLMNOPQRST";

    @Test
    @DisplayName("redeem: claims the code and grants a year of Plus for an account without it")
    void redeem_grantsPlus() {
        User user = new User();
        user.setId(USER_ID);
        long before = System.currentTimeMillis();
        when(redeemCodeRepository.claim(eq(CODE), eq(USER_ID), anyLong())).thenReturn(1);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(redeemCodeRepository.countByRedeemedAtIsNull()).thenReturn(100L);

        redeemService.redeem(USER_ID, CODE);

        assertThat(user.getPlusUntil())
                .isGreaterThanOrEqualTo(before + RedeemService.PLUS_DURATION_MILLIS);
        verify(userRepository).save(user);
        verify(redeemCodeRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    @DisplayName("redeem: throws INVALID_OR_USED_CODE when the code can't be claimed")
    void redeem_throws_whenCodeInvalidOrUsed() {
        when(redeemCodeRepository.claim(eq(CODE), eq(USER_ID), anyLong())).thenReturn(0);

        assertThatThrownBy(() -> redeemService.redeem(USER_ID, CODE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("INVALID_OR_USED_CODE");

        verify(userRepository, never()).findById(anyLong());
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("redeem: throws USER_NOT_FOUND when the account is missing after claiming")
    void redeem_throws_whenUserMissing() {
        when(redeemCodeRepository.claim(eq(CODE), eq(USER_ID), anyLong())).thenReturn(1);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redeemService.redeem(USER_ID, CODE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");
    }

    @Test
    @DisplayName("redeem: stacks a year on top of the remaining time when the account already has Plus")
    void redeem_extendsGrant_whenAlreadyPlus() {
        long existingUntil = System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000; // ~30 days left
        User user = new User();
        user.setId(USER_ID);
        user.setPlusUntil(existingUntil);
        when(redeemCodeRepository.claim(eq(CODE), eq(USER_ID), anyLong())).thenReturn(1);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(redeemCodeRepository.countByRedeemedAtIsNull()).thenReturn(100L);

        redeemService.redeem(USER_ID, CODE);

        assertThat(user.getPlusUntil()).isEqualTo(existingUntil + RedeemService.PLUS_DURATION_MILLIS);
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("ensurePool: mints a fresh batch of 100 codes when the pool runs low")
    void ensurePool_refillsWhenLow() {
        when(redeemCodeRepository.countByRedeemedAtIsNull()).thenReturn(5L);

        redeemService.ensurePool();

        verify(redeemCodeRepository).saveAll(argThat((List<RedeemCode> batch) ->
                batch.size() == 100 && batch.stream().allMatch(c -> c.getCode().startsWith("PLUS-"))
        ));
    }

    @Test
    @DisplayName("ensurePool: does nothing when the pool is well stocked")
    void ensurePool_noopWhenStocked() {
        when(redeemCodeRepository.countByRedeemedAtIsNull()).thenReturn(50L);

        redeemService.ensurePool();

        verify(redeemCodeRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }
}
