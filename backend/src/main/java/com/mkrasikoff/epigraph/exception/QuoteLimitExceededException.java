package com.mkrasikoff.epigraph.exception;

public class QuoteLimitExceededException extends RuntimeException {

    public QuoteLimitExceededException(int limit) {
        super(buildMessage(limit));
    }

    public static String buildMessage(int limit) {
        return "Достигнут лимит в " + limit + " цитат на аккаунт";
    }
}
