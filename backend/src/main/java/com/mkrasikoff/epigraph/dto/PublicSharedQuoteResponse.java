package com.mkrasikoff.epigraph.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for GET /api/shared/{token} — the public, unauthenticated view of a
 * shared quote. alreadyImported is only meaningful when the request carried a
 * valid JWT; it's false for anonymous visitors regardless of their history.
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
}
