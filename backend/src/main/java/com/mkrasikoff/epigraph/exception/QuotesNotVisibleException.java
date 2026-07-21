package com.mkrasikoff.epigraph.exception;

/**
 * The caller is not an accepted friend of the user whose quotes they asked for
 * (TASK-129). A 403 rather than a 404: the profile itself is readable by any
 * signed-in user, so pretending it doesn't exist would be a lie the rest of the
 * API doesn't tell.
 *
 * Deliberately narrow — a friend whose owner shares nothing gets an empty list,
 * not this. Refusing access and having nothing to show are different answers.
 */
public class QuotesNotVisibleException extends RuntimeException {

    public QuotesNotVisibleException(String message) {
        super(message);
    }
}
