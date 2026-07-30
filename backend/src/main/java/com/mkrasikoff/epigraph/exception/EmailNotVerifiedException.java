package com.mkrasikoff.epigraph.exception;

/**
 * Raised by {@code AuthService.login} when the supplied credentials are correct but the account's
 * email has never been verified. Distinct from a plain bad-credentials failure so the controller
 * can steer the user into the verification flow (resend a code, enter it) instead of showing a
 * dead-end "wrong email or password". It is only raised once the password has matched, so it never
 * reveals that an email is registered to someone who doesn't know the password (no enumeration).
 */
public class EmailNotVerifiedException extends RuntimeException {

    public EmailNotVerifiedException(String email) {
        super("Email not verified: " + email);
    }
}
