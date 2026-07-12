package com.mkrasikoff.epigraph.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for GET /api/shared/{token} — the public, unauthenticated view of a
 * shared quote. alreadyImported/importedQuoteId are only meaningful when the
 * request carried a valid JWT; they're false/null for anonymous visitors
 * regardless of their history. importedQuoteId lets the frontend deep-link
 * straight to the visitor's own copy ("View in my collection") without a
 * second round trip.
 */
@Data
@AllArgsConstructor
public class PublicSharedQuoteResponse {

    private String text;
    private String author;
    private String source;
    private String tags;
    private Long createdAt;
    private boolean alreadyImported;
    private Long importedQuoteId;
}
