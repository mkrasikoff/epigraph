package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.UserActivityDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface UserActivityDayRepository extends JpaRepository<UserActivityDay, Long> {

    long countByUserId(Long userId);

    boolean existsByUserIdAndActivityDate(Long userId, LocalDate activityDate);
}
