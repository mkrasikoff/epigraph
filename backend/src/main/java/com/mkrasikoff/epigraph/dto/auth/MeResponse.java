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
}
