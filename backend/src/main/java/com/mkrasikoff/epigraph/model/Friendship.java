package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * A directed friendship between two users (TASK-129). The requester sent a
 * request to the addressee; {@link #status} is {@link #STATUS_PENDING} until the
 * addressee accepts, then {@link #STATUS_ACCEPTED}. Decline and remove-friend
 * both delete the row rather than setting a terminal status — see the 019
 * migration comment for why there is no DECLINED/REMOVED state.
 */
@Entity
@Table(name = "friendships")
@Data
public class Friendship {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_ACCEPTED = "ACCEPTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "addressee_id", nullable = false)
    private Long addresseeId;

    @Column(nullable = false, length = 20)
    private String status;

    /**
     * Unix timestamp в миллисекундах — когда была отправлена заявка.
     */
    @Column(name = "created_at", updatable = false, nullable = false)
    private Long createdAt;

    /**
     * Unix timestamp в миллисекундах — когда заявка была принята. Null, пока
     * статус PENDING.
     */
    @Column(name = "responded_at")
    private Long respondedAt;
}
