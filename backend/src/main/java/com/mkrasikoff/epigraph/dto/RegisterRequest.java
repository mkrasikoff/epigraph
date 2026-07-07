package com.mkrasikoff.epigraph.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;

@Data
@ToString(exclude = "password")
public class RegisterRequest {

    @NotBlank(message = "Email обязателен")
    @Email(message = "Некорректный формат email")
    @Size(max = 255, message = "Email слишком длинный")
    private String email;

    @NotBlank(message = "Пароль обязателен")
    @Size(min = 8, max = 128, message = "Пароль должен содержать от 8 до 128 символов")
    @Pattern(
            regexp = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$",
            message = "Пароль должен содержать минимум одну букву и одну цифру"
    )
    private String password;
}
