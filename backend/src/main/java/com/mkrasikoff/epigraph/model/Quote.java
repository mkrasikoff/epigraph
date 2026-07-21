package com.mkrasikoff.epigraph.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Entity
@Table(name = "quotes")
@Data
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @Column(name = "user_id")
    private Long userId;

    @NotBlank(message = "Quote text must not be empty")
    @Size(max = 1000, message = "QUOTE_TOO_LONG")
    @Column(length = 3000)
    private String text;

    @Size(max = 100, message = "AUTHOR_TOO_LONG")
    @Column(length = 255)
    private String author;

    @Size(max = 200, message = "SOURCE_TOO_LONG")
    @Column(length = 500)
    private String source;

    private boolean fav;

    /**
     * Stored as a comma-separated string, e.g. "tag1,tag2".
     */
    @Size(max = 500, message = "TAGS_TOO_LONG")
    @Column(length = 500)
    private String tags;

    /**
     * Unix timestamp in milliseconds.
     */
    @Column(updatable = false)
    private Long added;

    /**
     * True only for quotes created through the single "Add quote" form.
     * Batch imports and the onboarding instruction quotes leave this false —
     * achievement conditions that reward hand-curated content read only
     * manuallyAdded = true rows (see AchievementService). @JsonIgnore so a
     * client can't spoof it by including the field in a create/batch request
     * body — QuoteService always sets it server-side per code path.
     */
    @JsonIgnore
    @Column(name = "manually_added", updatable = false, nullable = false)
    private boolean manuallyAdded;

    /**
     * Provenance for quotes imported via a public share link — which SharedQuote
     * it came from, who shared it, and when. Null for quotes not imported this way.
     */
    @Column(name = "shared_quote_id", updatable = false)
    private Long sharedQuoteId;

    @Column(name = "shared_from_user_id", updatable = false)
    private Long sharedFromUserId;

    @Column(name = "imported_at", updatable = false)
    private Long importedAt;

    /**
     * For a quote saved from a friend's collection (TASK-129): the id of that
     * friend's source quote. Null for quotes not saved this way. Distinct from
     * {@link #sharedQuoteId} (a share-link import); see the 021 migration.
     */
    @Column(name = "imported_from_quote_id", updatable = false)
    private Long importedFromQuoteId;
}
