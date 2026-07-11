package com.mkrasikoff.epigraph.exception;

public class SharedQuoteNotFoundException extends RuntimeException {

    public SharedQuoteNotFoundException(String token) {
        super("Shared quote not found: " + token);
    }
}
