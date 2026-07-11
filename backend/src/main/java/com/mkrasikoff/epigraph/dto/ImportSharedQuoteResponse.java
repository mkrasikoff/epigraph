package com.mkrasikoff.epigraph.dto;

import com.mkrasikoff.epigraph.model.Quote;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Response for POST /api/shared/{token}/import. alreadyImported distinguishes
 * "just copied it into your collection" from "you'd already imported this link
 * before, here's your existing copy" — both return 200 with the Quote, no error.
 */
@Data
@AllArgsConstructor
public class ImportSharedQuoteResponse {

    private Quote quote;
    private boolean alreadyImported;
}
