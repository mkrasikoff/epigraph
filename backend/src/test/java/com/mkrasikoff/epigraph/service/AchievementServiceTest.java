package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.AchievementStatusResponse;
import com.mkrasikoff.epigraph.model.AchievementProgress;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.model.UserActivityDay;
import com.mkrasikoff.epigraph.repository.AchievementProgressRepository;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.UserActivityDayRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock private AchievementProgressRepository progressRepo;
    @Mock private UserActivityDayRepository activityDayRepo;
    @Mock private QuoteRepository quoteRepo;
    @Mock private UserRepository userRepo;

    @InjectMocks
    private AchievementService achievementService;

    private static final Long USER_ID = 1L;

    private AchievementProgress buildProgress(String key, int progress, Long unlockedAt) {
        AchievementProgress p = new AchievementProgress();
        p.setUserId(USER_ID);
        p.setAchievementKey(key);
        p.setProgress(progress);
        p.setUnlockedAt(unlockedAt);
        return p;
    }

    @Test
    @DisplayName("markActiveToday: inserts a row when today isn't recorded yet")
    void markActiveToday_insertsRow_whenMissing() {
        when(activityDayRepo.existsByUserIdAndActivityDate(eq(USER_ID), any(LocalDate.class))).thenReturn(false);

        achievementService.markActiveToday(USER_ID);

        verify(activityDayRepo).save(any(UserActivityDay.class));
    }

    @Test
    @DisplayName("markActiveToday: is a no-op when today is already recorded")
    void markActiveToday_noOp_whenAlreadyRecorded() {
        when(activityDayRepo.existsByUserIdAndActivityDate(eq(USER_ID), any(LocalDate.class))).thenReturn(true);

        achievementService.markActiveToday(USER_ID);

        verify(activityDayRepo, never()).save(any());
    }

    @Test
    @DisplayName("recordAction: unlocks explorer once all 5 distinct actions are recorded")
    void recordAction_unlocksExplorer_afterFiveDistinctActions() {
        AchievementProgress row = buildProgress("explorer", 4, null);
        row.setProgressDetail("add_quote,favorite_quote,import_quotes,change_theme");
        when(progressRepo.findByUserIdAndAchievementKey(USER_ID, "explorer")).thenReturn(Optional.of(row));
        when(progressRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        achievementService.recordAction(USER_ID, "edit_profile");

        ArgumentCaptor<AchievementProgress> captor = ArgumentCaptor.forClass(AchievementProgress.class);
        verify(progressRepo).save(captor.capture());
        assertThat(captor.getValue().getProgress()).isEqualTo(5);
        assertThat(captor.getValue().getUnlockedAt()).isNotNull();
    }

    @Test
    @DisplayName("recordAction: repeating an already-recorded action doesn't advance progress")
    void recordAction_repeatingAction_doesNotAdvanceProgress() {
        AchievementProgress row = buildProgress("explorer", 1, null);
        row.setProgressDetail("add_quote");
        when(progressRepo.findByUserIdAndAchievementKey(USER_ID, "explorer")).thenReturn(Optional.of(row));
        when(progressRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        achievementService.recordAction(USER_ID, "add_quote");

        ArgumentCaptor<AchievementProgress> captor = ArgumentCaptor.forClass(AchievementProgress.class);
        verify(progressRepo).save(captor.capture());
        assertThat(captor.getValue().getProgress()).isEqualTo(1);
        assertThat(captor.getValue().getUnlockedAt()).isNull();
    }

    @Test
    @DisplayName("evaluate: unlocks favorites_25 once 25 manually-added favorites are reached")
    void evaluate_unlocksFavorites25() {
        when(quoteRepo.countByUserIdAndManuallyAddedTrue(USER_ID)).thenReturn(0L);
        when(quoteRepo.countByUserIdAndManuallyAddedTrueAndFavTrue(USER_ID)).thenReturn(25L);
        when(quoteRepo.countDistinctManuallyAddedAuthors(USER_ID)).thenReturn(0L);
        when(activityDayRepo.countByUserId(USER_ID)).thenReturn(0L);
        when(progressRepo.findByUserIdAndAchievementKey(any(), any())).thenReturn(Optional.empty());
        when(progressRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        achievementService.evaluate(USER_ID);

        ArgumentCaptor<AchievementProgress> captor = ArgumentCaptor.forClass(AchievementProgress.class);
        verify(progressRepo, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        boolean favoritesUnlocked = captor.getAllValues().stream()
                .anyMatch(p -> p.getAchievementKey().equals("favorites_25") && p.getUnlockedAt() != null);
        assertThat(favoritesUnlocked).isTrue();
    }

    @Test
    @DisplayName("evaluate: does not unlock badges below the active-days threshold")
    void evaluate_doesNotUnlockBadges_belowThreshold() {
        when(quoteRepo.countByUserIdAndManuallyAddedTrue(USER_ID)).thenReturn(1L);
        when(quoteRepo.countByUserIdAndManuallyAddedTrueAndFavTrue(USER_ID)).thenReturn(0L);
        when(quoteRepo.countDistinctManuallyAddedAuthors(USER_ID)).thenReturn(0L);
        when(activityDayRepo.countByUserId(USER_ID)).thenReturn(3L);
        when(progressRepo.findByUserIdAndAchievementKey(any(), any())).thenReturn(Optional.empty());
        when(progressRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        achievementService.evaluate(USER_ID);

        ArgumentCaptor<AchievementProgress> captor = ArgumentCaptor.forClass(AchievementProgress.class);
        verify(progressRepo, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        boolean chroniclerUnlocked = captor.getAllValues().stream()
                .anyMatch(p -> p.getAchievementKey().equals("badge_chronicler") && p.getUnlockedAt() != null);
        assertThat(chroniclerUnlocked).isFalse();
    }

    @Test
    @DisplayName("evaluate: re-equips the highest-prestige unlocked badge")
    void evaluate_reequipsHighestBadge() {
        when(quoteRepo.countByUserIdAndManuallyAddedTrue(USER_ID)).thenReturn(1L);
        when(quoteRepo.countByUserIdAndManuallyAddedTrueAndFavTrue(USER_ID)).thenReturn(0L);
        when(quoteRepo.countDistinctManuallyAddedAuthors(USER_ID)).thenReturn(0L);
        when(activityDayRepo.countByUserId(USER_ID)).thenReturn(30L);
        when(progressRepo.findByUserIdAndAchievementKey(any(), any())).thenReturn(Optional.empty());
        when(progressRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(eq(USER_ID), any())).thenReturn(false);
        when(progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(USER_ID, "badge_novice")).thenReturn(true);
        when(progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(USER_ID, "badge_chronicler")).thenReturn(true);
        when(progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(USER_ID, "badge_collector")).thenReturn(true);

        User user = new User();
        user.setId(USER_ID);
        when(userRepo.findById(USER_ID)).thenReturn(Optional.of(user));

        achievementService.evaluate(USER_ID);

        assertThat(user.getEquippedBadge()).isEqualTo("collector");
        verify(userRepo).save(user);
    }

    @Test
    @DisplayName("isRewardUnlocked: true when the matching achievement is unlocked")
    void isRewardUnlocked_true_whenUnlocked() {
        when(progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(USER_ID, "authors_10")).thenReturn(true);

        assertThat(achievementService.isRewardUnlocked(USER_ID, "theme", "forest")).isTrue();
    }

    @Test
    @DisplayName("isRewardUnlocked: false for an unknown reward key")
    void isRewardUnlocked_false_forUnknownReward() {
        assertThat(achievementService.isRewardUnlocked(USER_ID, "theme", "not-a-theme")).isFalse();
    }

    @Test
    @DisplayName("getStatusForUser: returns the full catalog with per-user progress merged in")
    void getStatusForUser_returnsFullCatalog() {
        when(progressRepo.findByUserIdAndAchievementKey(any(), any())).thenReturn(Optional.empty());
        when(progressRepo.findByUserIdAndAchievementKey(USER_ID, "authors_10"))
                .thenReturn(Optional.of(buildProgress("authors_10", 7, null)));

        List<AchievementStatusResponse> statuses = achievementService.getStatusForUser(USER_ID);

        assertThat(statuses).hasSize(13);
        AchievementStatusResponse authors = statuses.stream()
                .filter(s -> s.getKey().equals("authors_10"))
                .findFirst().orElseThrow();
        assertThat(authors.getProgress()).isEqualTo(7);
        assertThat(authors.isUnlocked()).isFalse();
        assertThat(authors.getRewardType()).isEqualTo("theme");
        assertThat(authors.getRewardKey()).isEqualTo("forest");
    }
}
