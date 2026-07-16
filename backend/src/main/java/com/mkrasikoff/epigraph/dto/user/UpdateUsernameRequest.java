package com.mkrasikoff.epigraph.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUsernameRequest {

    @NotBlank(message = "USERNAME_REQUIRED")
    @Size(min = 3, max = 20, message = "USERNAME_LENGTH")
    @Pattern(
            regexp = "^[a-zA-Z0-9_]+$",
            message = "USERNAME_PATTERN"
    )
    private String username;
}
