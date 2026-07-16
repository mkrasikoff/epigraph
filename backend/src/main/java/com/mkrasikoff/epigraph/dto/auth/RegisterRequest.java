package com.mkrasikoff.epigraph.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Data
@ToString(exclude = "password")
public class RegisterRequest {

    @NotBlank(message = "EMAIL_REQUIRED")
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "EMAIL_TOO_LONG")
    private String email;

    @NotBlank(message = "PASSWORD_REQUIRED")
    @Size(min = 8, max = 128, message = "PASSWORD_LENGTH")
    @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$",
            message = "PASSWORD_PATTERN"
    )
    private String password;
}
