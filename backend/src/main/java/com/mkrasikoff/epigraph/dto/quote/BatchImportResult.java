package com.mkrasikoff.epigraph.dto.quote;

import com.mkrasikoff.epigraph.model.Quote;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * Response for POST /api/quotes/batch — quotes that were saved, and quotes that failed
 * validation (with reasons), so the frontend can let the user recover the rejected ones.
 */
@Data
@AllArgsConstructor
public class BatchImportResult {

    private List<Quote> saved;
    private List<RejectedQuote> rejected;
}
