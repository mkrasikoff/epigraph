package com.mkrasikoff.epigraph.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank
    @Size(min = 8, message = "Пароль должен содержать минимум 8 символов")
    private String newPassword;
}
