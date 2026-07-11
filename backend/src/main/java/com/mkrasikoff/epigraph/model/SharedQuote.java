package com.mkrasikoff.epigraph.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * A public, permanent share link for a quote. text/author/source/tags are a
 * frozen snapshot taken when the link was created — see the 016 migration
 * comment for why this table doesn't reference Quote's live fields.
 */
@Entity
@Table(name = "shared_quotes")
@Data
public class SharedQuote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String token;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "source_quote_id")
    private Long sourceQuoteId;

    @Column(length = 3000, nullable = false)
    private String text;

    @Column(length = 255)
    private String author;

    @Column(length = 500)
    private String source;

    @Column(length = 500)
    private String tags;

    /**
     * Unix timestamp в миллисекундах
     */
    @Column(name = "created_at", updatable = false, nullable = false)
    private Long createdAt;
}
