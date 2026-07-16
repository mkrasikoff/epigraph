package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateAvatarRequest {

    @NotBlank(message = "AVATAR_REQUIRED")
    @Pattern(
            regexp = "^(neutral|bear|cat|dog|hamster|rabbit|fox|owl|elephant|mouse|duck|seal)$",
            message = "AVATAR_INVALID"
    )
    private String avatarIcon;
}
