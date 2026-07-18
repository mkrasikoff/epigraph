package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateThemeStyleRequest {

    @NotBlank(message = "THEME_REQUIRED")
    @Pattern(
            regexp = "^(classic|forest|cosmos|ocean|sunset|noir)$",
            message = "THEME_INVALID"
    )
    private String themeStyle;
}
