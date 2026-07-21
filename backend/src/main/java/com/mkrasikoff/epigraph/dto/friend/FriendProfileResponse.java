package com.mkrasikoff.epigraph.dto.friend;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * Another user's profile page (TASK-129). Like {@link UserSummaryResponse} this
 * never carries email or any private field — it is the surface you look at to
 * decide whether to send a friend request, so it is readable by any signed-in
 * user. Quotes are deliberately not here: reading someone's collection stays
 * gated behind friendship and lands in a later slice.
 *
 * {@code themeStyle} is public on purpose — the client paints the profile page
 * in the viewed user's theme (in the viewer's own light/dark mode).
 */
@Data
@AllArgsConstructor
public class FriendProfileResponse {

    private Long id;
    private String username;
    private String avatarIcon;
    private String equippedBadge;
    private String themeStyle;
    private boolean plus;

    /**
     * Unix timestamp в миллисекундах — когда создан аккаунт ("с нами с …").
     */
    private Long memberSince;

    /**
     * Дней подряд с активностью, на текущий момент.
     */
    private int currentStreak;

    private long quoteCount;

    /**
     * Keys of the achievements this user has unlocked, for the icon strip.
     */
    private List<String> unlockedAchievements;

    /**
     * The viewer's relationship to this user (see FriendshipService.RelationStatus).
     */
    private String relation;

    /**
     * Сколько своей коллекции показывает этот пользователь: none / favorites /
     * all. Null для не-друзей — им незачем знать чужую настройку.
     */
    private String quotesVisibility;
}
