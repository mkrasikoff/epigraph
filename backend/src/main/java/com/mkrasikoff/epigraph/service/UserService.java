package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    @Value("${app.base-url}")
    private String baseUrl;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    @Transactional
    public void deleteAccount(Long userId) {
        userRepository.deleteById(userId);
    }

    /**
     * Sets the user's password.
     * No current-password check — account recovery is handled by the
     * forgot-password / email-verification flow. After this call the
     * user can always log in locally, so provider is normalised to "local".
     */
    @Transactional
    public void changePassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setProvider("local");

        userRepository.save(user);
    }

    /**
     * Initiates the password-reset flow: generates a short-lived reset token,
     * builds the reset link, and sends it to the user's email.
     * Silently does nothing when the email is unknown — avoids user enumeration.
     */
    @Transactional(readOnly = true)
    public void initiatePasswordReset(String email) {
        userRepository.findByEmail(email)
                .filter(User::isEmailVerified)
                .ifPresent(user -> {
                    String token = jwtService.generateResetToken(user.getId());
                    String link = baseUrl + "/?reset=" + token;
                    emailService.sendPasswordResetLink(email, link);
                });
    }

    @Transactional(readOnly = true)
    public String getEmailByUserId(Long userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
    }

    @Transactional(readOnly = true)
    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * Sets the user's display name (username). Purely cosmetic — not unique,
     * validated only for format/length by the controller-level DTO.
     */
    @Transactional
    public void updateUsername(Long userId, String username) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setUsername(username);
        userRepository.save(user);
    }

    /**
     * Sets the user's avatar icon. Value is restricted to a fixed set of
     * presets, validated at the controller-level DTO.
     */
    @Transactional
    public void updateAvatarIcon(Long userId, String avatarIcon) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setAvatarIcon(avatarIcon);
        userRepository.save(user);
    }

    /**
     * Sets the user's interface language preference ("ru" or "en").
     */
    @Transactional
    public void updatePreferredLanguage(Long userId, String preferredLanguage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setPreferredLanguage(preferredLanguage);
        userRepository.save(user);
    }

    /**
     * Sets the user's visual theme style. Value is restricted to a fixed set
     * of presets, validated at the controller-level DTO.
     */
    @Transactional
    public void updateThemeStyle(Long userId, String themeStyle) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setThemeStyle(themeStyle);
        userRepository.save(user);
    }
}
