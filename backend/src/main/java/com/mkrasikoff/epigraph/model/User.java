package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     *  null для OAuth-пользователей
     */
    @Column(length = 255)
    private String password;

    /**
     * "local", "google"
     */
    @Column(nullable = false, length = 50)
    private String provider;

    /**
     * ID из Google, если provider = "google"
     */
    @Column(length = 255)
    private String providerId;

    @Column(updatable = false)
    private Long createdAt;

    /**
     * False until the user confirms their email address.
     * Google OAuth users are marked as verified immediately.
     */
    @Column(nullable = false)
    private boolean emailVerified = true;

    /**
     * Display name chosen by the user. Purely cosmetic — not unique, not used
     * as an identifier anywhere. Defaults to a name derived from the OAuth
     * provider (Google/Yandex) on first login, or is set explicitly at
     * registration for local accounts.
     */
    @Column(length = 20)
    private String username;
}
