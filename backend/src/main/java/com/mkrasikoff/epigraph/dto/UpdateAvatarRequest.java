package com.mkrasikoff.epigraph.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateAvatarRequest {

    @NotBlank(message = "Иконка обязательна")
    @Pattern(
            regexp = "^(neutral|bear|cat|dog|hamster|rabbit|fox|owl|elephant|mouse|duck|seal)$",
            message = "Недопустимая иконка"
    )
    private String avatarIcon;
}
