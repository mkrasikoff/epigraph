package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDate;

/**
 * One row per (user, calendar day) with real activity — upserted from
 * AchievementService.markActiveToday(), never from a page-load/GET request.
 * Feeds both the week_streak achievement and the day-threshold badge ladder
 * off the same COUNT(*).
 */
@Entity
@Table(name = "user_activity_days")
@Data
public class UserActivityDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;
}
