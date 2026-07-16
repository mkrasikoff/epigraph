package com.mkrasikoff.epigraph.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Holds the {@link PasswordEncoder} bean deliberately apart from {@link SecurityConfig}.
 *
 * SecurityConfig wires {@link OAuth2SuccessHandler} into the filter chain, and that handler now
 * depends — via AuthService — on the PasswordEncoder. Declaring the encoder inside SecurityConfig
 * would therefore close a bean cycle:
 * SecurityConfig → OAuth2SuccessHandler → AuthService → PasswordEncoder(SecurityConfig).
 * Keeping it in this dependency-free config breaks that loop.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
