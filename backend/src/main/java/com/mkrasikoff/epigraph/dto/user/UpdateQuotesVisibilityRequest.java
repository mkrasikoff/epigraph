package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateQuotesVisibilityRequest {

    @NotBlank(message = "QUOTES_VISIBILITY_REQUIRED")
    @Pattern(
            regexp = "^(none|favorites|all)$",
            message = "QUOTES_VISIBILITY_INVALID"
    )
    private String quotesVisibility;
}
