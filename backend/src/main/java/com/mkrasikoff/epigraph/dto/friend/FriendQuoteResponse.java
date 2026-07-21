package com.mkrasikoff.epigraph.dto.friend;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * One quote from a friend's collection (TASK-129). A deliberately narrower view
 * than the Quote entity: it drops {@code userId} and the owner's own
 * {@code fav} flag, which are the reader's business in neither case — a friend
 * sees the quote, not how its owner filed it.
 */
@Data
@AllArgsConstructor
public class FriendQuoteResponse {

    private Long id;
    private String text;
    private String author;
    private String source;
    private String tags;

    /**
     * Unix timestamp в миллисекундах — когда цитата добавлена.
     */
    private Long added;

    /**
     * Уже ли эта цитата сохранена смотрящим в свою коллекцию (TASK-129) —
     * чтобы кнопка «+» сразу показывала состояние «сохранено».
     */
    private boolean alreadySaved;
}
