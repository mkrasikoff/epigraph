package com.mkrasikoff.epigraph.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for GET /api/auth/me — the authenticated user's own profile info.
 */
@Data
@AllArgsConstructor
public class MeResponse {

    private Long id;
    private String email;
    private String username;
    private String avatarIcon;
    private String preferredLanguage;
    private String themeStyle;
    private String equippedBadge;
    private boolean plus;

    /**
     * Неотвеченных входящих заявок в друзья — для значка в шапке (TASK-129).
     * Это индексированный count по (addressee_id, status), а не обход истории,
     * поэтому его не жалко считать на каждый вызов /me.
     */
    private int pendingFriendRequests;

    /**
     * Кому видны цитаты пользователя: none / favorites / all (TASK-129).
     * Нужен настройкам, чтобы отрисовать текущий выбор.
     */
    private String quotesVisibility;

    /**
     * Живая серия подряд идущих активных дней (AchievementService.currentStreak),
     * посчитанная на каждый /me из user_activity_days — единый источник для всех
     * мест, где показываются «N дней подряд» (профиль, факт-стрип, рейл статистики),
     * вместо сохранённого week_streak progress, который мог отставать (TASK-136).
     */
    private int currentStreak;
}
