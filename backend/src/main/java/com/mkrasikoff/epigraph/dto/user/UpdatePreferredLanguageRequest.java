package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdatePreferredLanguageRequest {

    @NotBlank(message = "LANGUAGE_REQUIRED")
    @Pattern(
            regexp = "^(ru|en)$",
            message = "LANGUAGE_INVALID"
    )
    private String preferredLanguage;
}
