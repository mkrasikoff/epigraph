package com.mkrasikoff.epigraph.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUsernameRequest {

    @NotBlank(message = "Имя пользователя обязательно")
    @Size(min = 3, max = 20, message = "Имя пользователя должно содержать от 3 до 20 символов")
    @Pattern(
            regexp = "^[a-zA-Z0-9_]+$",
            message = "Имя пользователя может содержать только латинские буквы, цифры и подчёркивание"
    )
    private String username;
}
