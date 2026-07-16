package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdatePreferredLanguageRequest {

    @NotBlank(message = "Язык обязателен")
    @Pattern(
            regexp = "^(ru|en)$",
            message = "Недопустимый язык"
    )
    private String preferredLanguage;
}
