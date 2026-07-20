package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.achievement.AchievementCatalog;
import com.mkrasikoff.epigraph.achievement.AchievementDefinition;
import com.mkrasikoff.epigraph.dto.achievement.AchievementStatusResponse;
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
 * theme update) and, as of TASK-124, from GET /api/auth/me on every app
 * bootstrap — a "day of activity" is meant to mean "the user opened
 * Epigraph", not "the user happened to add or edit a quote", so simply
 * loading the app has to be able to mark the day and refresh progress too.
 * Never called for guests (no userId to evaluate against).
 * achievement_progress.unlockedAt is the sole source of truth for
 * privileges; UserService/UserController consult isRewardUnlocked() rather
 * than re-deriving eligibility from raw counts.
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
     * as the QoD calendar day) if it isn't already there — one cheap exists
     * check on every call after the first one for a given day. Returns
     * whether a new row was actually inserted, so callers driven by a
     * high-frequency signal (GET /api/auth/me on every app load, as of
     * TASK-124) can skip re-running evaluate()'s much heavier query set
     * unless today genuinely just became a new activity day for this user.
     */
    @Transactional
    public boolean markActiveToday(Long userId) {
        LocalDate today = LocalDate.now(ACTIVITY_ZONE);
        if (activityDayRepo.existsByUserIdAndActivityDate(userId, today)) return false;

        UserActivityDay day = new UserActivityDay();
        day.setUserId(userId);
        day.setActivityDate(today);
        activityDayRepo.save(day);
        return true;
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
        AchievementDefinition explorer = achievementDef("explorer");

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
     *
     * favorites_25 deliberately reads countByUserIdAndFavTrue (every favorited
     * quote), not a manuallyAdded-gated count like authors_10/badge_novice —
     * favoriting a quote imported via a share link (TASK-125) is still a real
     * choice by the user, unlike "added N quotes"/"N distinct authors", which
     * would be trivially inflated by importing a large collection at once.
     *
     * Thresholds are read from the catalog (achievementDef(key).threshold())
     * rather than hardcoded here — they previously duplicated the catalog's
     * numbers as literals and had drifted out of sync (favorites_25 checked
     * against 25 here while the catalog/frontend showed a 50 goal; authors_10
     * similarly checked 10 against a displayed 25), silently unlocking early.
     */
    @Transactional
    public void evaluate(Long userId) {
        long manualQuotes = quoteRepo.countByUserIdAndManuallyAddedTrue(userId);
        long favoritedQuotes = quoteRepo.countByUserIdAndFavTrue(userId);
        long manualAuthors = quoteRepo.countDistinctManuallyAddedAuthors(userId);
        long activeDays = activityDayRepo.countByUserId(userId);

        upsertProgress(userId, "favorites_25", favoritedQuotes, achievementDef("favorites_25").threshold());
        upsertProgress(userId, "authors_10", manualAuthors, achievementDef("authors_10").threshold());
        upsertProgress(userId, "week_streak", currentStreak(userId), achievementDef("week_streak").threshold());

        upsertProgress(userId, AchievementCatalog.BADGE_NOVICE, manualQuotes, achievementDef(AchievementCatalog.BADGE_NOVICE).threshold());
        for (AchievementDefinition badge : AchievementCatalog.BADGE_ACHIEVEMENTS) {
            if (badge.key().equals(AchievementCatalog.BADGE_NOVICE)) continue;
            upsertProgress(userId, badge.key(), activeDays, badge.threshold());
        }

        reequipBadge(userId);
    }

    private AchievementDefinition achievementDef(String key) {
        return AchievementCatalog.ALL.stream()
                .filter(a -> a.key().equals(key))
                .findFirst()
                .orElseThrow();
    }

    /**
     * Length of the run of consecutive calendar days with activity ending
     * today or yesterday. Returns 0 for a user with no activity rows, and also
     * for one whose last active day is older than that — the run is finished,
     * not "current". Feeds "week_streak"/Закат and the "дней подряд" line on a
     * friend's profile (TASK-129); the day-count badge ladder deliberately
     * stays a total, gap-tolerant count (see AchievementCatalog), so it must
     * not use this.
     *
     * Dropping back to 0 never revokes a reward: upsertProgress() stamps
     * unlockedAt once and never clears it, so "Закат" stays unlocked even if
     * the streak that earned it lapses.
     */
    @Transactional(readOnly = true)
    public int currentStreak(Long userId) {
        List<LocalDate> dates = activityDayRepo.findActivityDatesDesc(userId);
        if (dates.isEmpty()) return 0;

        // A run that ended before yesterday is over, not current — without this
        // check, someone who stopped months ago keeps reporting the streak they
        // had back then. Yesterday still counts: today simply hasn't been
        // recorded yet, and the run can still be continued before the day ends.
        LocalDate today = LocalDate.now(ACTIVITY_ZONE);
        if (dates.get(0).isBefore(today.minusDays(1))) return 0;

        int streak = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i - 1).minusDays(1).equals(dates.get(i))) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
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
