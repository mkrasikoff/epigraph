package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateThemeStyleRequest {

    @NotBlank(message = "Тема обязательна")
    @Pattern(
            regexp = "^(classic|forest|cosmos|ocean|sunset)$",
            message = "Недопустимая тема"
    )
    private String themeStyle;
}
