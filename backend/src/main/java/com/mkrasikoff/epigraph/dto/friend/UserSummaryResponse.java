package com.mkrasikoff.epigraph.dto.friend;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * A safe, public view of another user (TASK-129) — used in the friends list,
 * incoming requests, and search results. Deliberately never carries email or
 * any other private field; {@code relation} is the viewer's own relationship to
 * this user (see FriendshipService.RelationStatus) so the client can pick the
 * right action button.
 */
@Data
@AllArgsConstructor
public class UserSummaryResponse {

    private Long id;
    private String username;
    private String avatarIcon;
    private String equippedBadge;
    private String relation;
}
