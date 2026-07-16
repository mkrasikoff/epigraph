package com.mkrasikoff.epigraph.exception;

public class QuoteLimitExceededException extends RuntimeException {

    public QuoteLimitExceededException() {
        super(ApiCodes.QUOTE_LIMIT_EXCEEDED);
    }
}
