package com.mkrasikoff.epigraph.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Entity
@Table(name = "quotes")
@Data
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @Column(name = "user_id")
    private Long userId;

    @NotBlank(message = "Quote text must not be empty")
    @Size(max = 1000, message = "Размер цитаты не должен превышать 1000 символов")
    @Column(length = 3000)
    private String text;

    @Size(max = 100, message = "Имя автора не должна превышать 100 символов")
    @Column(length = 255)
    private String author;

    @Size(max = 200, message = "Длина источника не должна превышать 200 символов")
    @Column(length = 500)
    private String source;

    private boolean fav;

    /**
     * Хранится как "tag1,tag2" (строка)
     */
    @Size(max = 500, message = "Tags must not exceed 500 characters")
    @Column(length = 500)
    private String tags;

    /**
     * Unix timestamp в миллисекундах
     */
    @Column(updatable = false)
    private Long added;

    /**
     * True only for quotes created through the single "Add quote" form.
     * Batch imports and the onboarding instruction quotes leave this false —
     * achievement conditions that reward hand-curated content read only
     * manuallyAdded = true rows (see AchievementService). @JsonIgnore so a
     * client can't spoof it by including the field in a create/batch request
     * body — QuoteService always sets it server-side per code path.
     */
    @JsonIgnore
    @Column(name = "manually_added", updatable = false, nullable = false)
    private boolean manuallyAdded;
}
