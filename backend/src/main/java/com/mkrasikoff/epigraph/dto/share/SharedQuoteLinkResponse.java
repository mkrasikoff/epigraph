package com.mkrasikoff.epigraph.dto.share;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for POST /api/quotes/{id}/share — the frontend builds the full
 * public URL from the token (e.g. `${origin}/s/${token}`).
 */
@Data
@AllArgsConstructor
public class SharedQuoteLinkResponse {

    private String token;
}
