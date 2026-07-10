package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.AchievementProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementProgressRepository extends JpaRepository<AchievementProgress, Long> {

    List<AchievementProgress> findByUserId(Long userId);

    Optional<AchievementProgress> findByUserIdAndAchievementKey(Long userId, String achievementKey);

    boolean existsByUserIdAndAchievementKeyAndUnlockedAtIsNotNull(Long userId, String achievementKey);
}
