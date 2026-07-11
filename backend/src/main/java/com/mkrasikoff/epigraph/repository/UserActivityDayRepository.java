package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.UserActivityDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface UserActivityDayRepository extends JpaRepository<UserActivityDay, Long> {

    long countByUserId(Long userId);

    boolean existsByUserIdAndActivityDate(Long userId, LocalDate activityDate);

    /**
     * Most-recent-first, for walking backward to find the current run of
     * consecutive days (AchievementService.currentStreak()) — countByUserId()
     * alone can't tell a genuine streak from days scattered across months.
     */
    @Query("SELECT a.activityDate FROM UserActivityDay a WHERE a.userId = :userId ORDER BY a.activityDate DESC")
    List<LocalDate> findActivityDatesDesc(@Param("userId") Long userId);
}
