package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.achievement.AchievementCatalog;
import com.mkrasikoff.epigraph.achievement.AchievementDefinition;
import com.mkrasikoff.epigraph.dto.AchievementStatusResponse;
import com.mkrasikoff.epigraph.model.AchievementProgress;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.model.UserActivityDay;
import com.mkrasikoff.epigraph.repository.AchievementProgressRepository;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.UserActivityDayRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Evaluates and stores achievement progress (TASK-122). Called from the
 * existing mutation endpoints (quote create/favorite/import, avatar/username/
 * theme update) — never from a page-load/GET request, and never for guests
 * (no userId to evaluate against). achievement_progress.unlockedAt is the
 * sole source of truth for privileges; UserService/UserController consult
 * isRewardUnlocked() rather than re-deriving eligibility from raw counts.
 */
@Service
public class AchievementService {

    private static final ZoneId ACTIVITY_ZONE = ZoneId.of("Europe/Moscow");

    private final AchievementProgressRepository progressRepo;
    private final UserActivityDayRepository activityDayRepo;
    private final QuoteRepository quoteRepo;
    private final UserRepository userRepo;

    public AchievementService(AchievementProgressRepository progressRepo,
                              UserActivityDayRepository activityDayRepo,
                              QuoteRepository quoteRepo,
                              UserRepository userRepo) {
        this.progressRepo = progressRepo;
        this.activityDayRepo = activityDayRepo;
        this.quoteRepo = quoteRepo;
        this.userRepo = userRepo;
    }

    /**
     * Upserts today's row into user_activity_days (Europe/Moscow, same zone
     * as the QoD calendar day) if it isn't already there. Cheap no-op on
     * every call after the first one for a given day.
     */
    @Transactional
    public void markActiveToday(Long userId) {
        LocalDate today = LocalDate.now(ACTIVITY_ZONE);
        if (activityDayRepo.existsByUserIdAndActivityDate(userId, today)) return;

        UserActivityDay day = new UserActivityDay();
        day.setUserId(userId);
        day.setActivityDate(today);
        activityDayRepo.save(day);
    }

    /**
     * Records a distinct "explorer" action for the user (add_quote,
     * favorite_quote, import_quotes, change_theme, edit_profile). Repeating
     * an already-recorded action is a no-op — only the count of distinct
     * actions ever recorded feeds the achievement, so there's no benefit to
     * repeating one.
     */
    @Transactional
    public void recordAction(Long userId, String actionKey) {
        AchievementDefinition explorer = AchievementCatalog.THEME_ACHIEVEMENTS.stream()
                .filter(a -> a.key().equals("explorer"))
                .findFirst()
                .orElseThrow();

        AchievementProgress row = progressRepo.findByUserIdAndAchievementKey(userId, explorer.key())
                .orElseGet(() -> {
                    AchievementProgress p = new AchievementProgress();
                    p.setUserId(userId);
                    p.setAchievementKey(explorer.key());
                    return p;
                });

        Set<String> actions = row.getProgressDetail() == null || row.getProgressDetail().isBlank()
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(List.of(row.getProgressDetail().split(",")));

        actions.add(actionKey);

        row.setProgressDetail(String.join(",", actions));
        row.setProgress(actions.size());
        if (row.getUnlockedAt() == null && actions.size() >= explorer.threshold()) {
            row.setUnlockedAt(System.currentTimeMillis());
        }

        progressRepo.save(row);
    }

    /**
     * Recomputes every count/distinct/streak-based achievement (everything
     * except "explorer", which is updated incrementally by recordAction())
     * from current data, upserts unlock status, then re-equips the badge.
     */
    @Transactional
    public void evaluate(Long userId) {
        long manualQuotes = quoteRepo.countByUserIdAndManuallyAddedTrue(userId);
        long manualFavorites = quoteRepo.countByUserIdAndManuallyAddedTrueAndFavTrue(userId);
        long manualAuthors = quoteRepo.countDistinctManuallyAddedAuthors(userId);
        long activeDays = activityDayRepo.countByUserId(userId);

        upsertProgress(userId, "favorites_25", manualFavorites, 25);
        upsertProgress(userId, "authors_10", manualAuthors, 10);
        upsertProgress(userId, "week_streak", activeDays, 7);

        upsertProgress(userId, AchievementCatalog.BADGE_NOVICE, manualQuotes, 1);
        for (AchievementDefinition badge : AchievementCatalog.BADGE_ACHIEVEMENTS) {
            if (badge.key().equals(AchievementCatalog.BADGE_NOVICE)) continue;
            upsertProgress(userId, badge.key(), activeDays, badge.threshold());
        }

        reequipBadge(userId);
    }

    private void upsertProgress(Long userId, String achievementKey, long currentValue, int threshold) {
        AchievementProgress row = progressRepo.findByUserIdAndAchievementKey(userId, achievementKey)
                .orElseGet(() -> {
                    AchievementProgress p = new AchievementProgress();
                    p.setUserId(userId);
                    p.setAchievementKey(achievementKey);
                    return p;
                });

        row.setProgress((int) Math.min(currentValue, Integer.MAX_VALUE));
        if (row.getUnlockedAt() == null && currentValue >= threshold) {
            row.setUnlockedAt(System.currentTimeMillis());
        }

        progressRepo.save(row);
    }

    /**
     * Sets equippedBadge to the highest-prestige badge the user has
     * unlocked (BADGE_ACHIEVEMENTS is defined in ascending threshold order,
     * so the last unlocked entry wins). Never null-clears an already-lower
     * badge back to null — only moves forward.
     */
    private void reequipBadge(Long userId) {
        String highestUnlocked = null;
        for (AchievementDefinition badge : AchievementCatalog.BADGE_ACHIEVEMENTS) {
            boolean unlocked = progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(userId, badge.key());
            if (unlocked) highestUnlocked = badge.rewardKey();
        }

        if (highestUnlocked == null) return;
        String resolvedBadge = highestUnlocked;

        userRepo.findById(userId).ifPresent(user -> {
            if (!resolvedBadge.equals(user.getEquippedBadge())) {
                user.setEquippedBadge(resolvedBadge);
                userRepo.save(user);
            }
        });
    }

    /**
     * Whether the user currently holds the given reward — the only check
     * UserController should use to gate applying a theme/badge, never a
     * recomputation of the underlying condition.
     */
    @Transactional(readOnly = true)
    public boolean isRewardUnlocked(Long userId, String rewardType, String rewardKey) {
        return AchievementCatalog.ALL.stream()
                .filter(a -> a.rewardType().equals(rewardType) && a.rewardKey().equals(rewardKey))
                .findFirst()
                .map(a -> progressRepo.existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(userId, a.key()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<AchievementStatusResponse> getStatusForUser(Long userId) {
        return AchievementCatalog.ALL.stream()
                .map(def -> {
                    Optional<AchievementProgress> row = progressRepo.findByUserIdAndAchievementKey(userId, def.key());
                    int progress = row.map(AchievementProgress::getProgress).orElse(0);
                    Long unlockedAt = row.map(AchievementProgress::getUnlockedAt).orElse(null);

                    return new AchievementStatusResponse(
                            def.key(), def.conditionType(), def.threshold(),
                            progress, unlockedAt != null, unlockedAt,
                            def.rewardType(), def.rewardKey()
                    );
                })
                .toList();
    }
}
