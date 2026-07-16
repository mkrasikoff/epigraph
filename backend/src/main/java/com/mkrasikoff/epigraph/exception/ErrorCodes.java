package com.mkrasikoff.epigraph.exception;

/**
 * Stable, language-agnostic error codes returned to the client in place of human-readable prose.
 *
 * The frontend owns display localization (it is bilingual, see i18n.js): it maps each code to a
 * {@code t()} translation, so the same backend response reads correctly in Russian and English.
 * These string values are a contract shared with the frontend's ERROR_CODE_KEYS map — never
 * rename one without updating that map.
 *
 * Carried as the {@code message}/{@code error} value of the existing error response shapes, so the
 * response envelope is unchanged; only the value is now a code rather than a sentence.
 */
public final class ErrorCodes {

    public static final String USER_NOT_FOUND = "USER_NOT_FOUND";
    public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public static final String EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED";
    public static final String INVALID_OR_EXPIRED_CODE = "INVALID_OR_EXPIRED_CODE";

    private ErrorCodes() {
    }
}
