package com.mkrasikoff.epigraph.dto.quote;

import com.mkrasikoff.epigraph.model.Quote;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * A quote from a batch import that failed validation, paired with the reasons why.
 */
@Data
@AllArgsConstructor
public class RejectedQuote {

    private Quote quote;
    private List<String> errors;
}
