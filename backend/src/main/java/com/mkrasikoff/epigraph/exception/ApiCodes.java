package com.mkrasikoff.epigraph.exception;

/**
 * Stable, language-agnostic response codes returned to the client in place of human-readable prose
 * — both error codes and success confirmations.
 *
 * The frontend owns display localization (it is bilingual, see i18n.js): it maps each code to a
 * {@code t()} translation, so the same backend response reads correctly in Russian and English.
 * These string values are a contract shared with the frontend's ERROR_CODE_KEYS map — never
 * rename one without updating that map. (Success confirmations are not mapped there: the client
 * shows its own success toast and ignores the response body — they exist only so the backend never
 * returns display prose.)
 *
 * Carried as the {@code message}/{@code error} value of the existing response shapes, so the
 * envelope is unchanged; only the value is now a code rather than a sentence.
 */
public final class ApiCodes {

    // Errors
    public static final String USER_NOT_FOUND = "USER_NOT_FOUND";
    public static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public static final String EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED";
    public static final String INVALID_OR_EXPIRED_CODE = "INVALID_OR_EXPIRED_CODE";
    public static final String THEME_LOCKED = "THEME_LOCKED";
    public static final String AVATAR_LOCKED = "AVATAR_LOCKED";
    public static final String RESET_LINK_INVALID = "RESET_LINK_INVALID";
    public static final String BAD_REQUEST = "BAD_REQUEST";
    public static final String QUOTE_LIMIT_EXCEEDED = "QUOTE_LIMIT_EXCEEDED";
    public static final String INVALID_OR_USED_CODE = "INVALID_OR_USED_CODE";
    public static final String CANNOT_FRIEND_SELF = "CANNOT_FRIEND_SELF";
    public static final String ALREADY_FRIENDS = "ALREADY_FRIENDS";
    public static final String REQUEST_ALREADY_SENT = "REQUEST_ALREADY_SENT";
    public static final String FRIEND_REQUEST_NOT_FOUND = "FRIEND_REQUEST_NOT_FOUND";
    public static final String FRIENDSHIP_NOT_FOUND = "FRIENDSHIP_NOT_FOUND";
    public static final String NOT_FRIENDS = "NOT_FRIENDS";

    // Success confirmations (not displayed to the client — see class doc)
    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String USERNAME_UPDATED = "USERNAME_UPDATED";
    public static final String AVATAR_UPDATED = "AVATAR_UPDATED";
    public static final String LANGUAGE_UPDATED = "LANGUAGE_UPDATED";
    public static final String THEME_UPDATED = "THEME_UPDATED";
    public static final String PLUS_ACTIVATED = "PLUS_ACTIVATED";
    public static final String QUOTES_VISIBILITY_UPDATED = "QUOTES_VISIBILITY_UPDATED";
    public static final String FRIEND_REQUEST_SENT = "FRIEND_REQUEST_SENT";
    public static final String FRIEND_REQUEST_ACCEPTED = "FRIEND_REQUEST_ACCEPTED";
    public static final String FRIEND_REQUEST_DECLINED = "FRIEND_REQUEST_DECLINED";
    public static final String FRIEND_REMOVED = "FRIEND_REMOVED";
    public static final String FRIEND_QUOTE_SAVED = "FRIEND_QUOTE_SAVED";

    private ApiCodes() {
    }
}
