package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.ApiCodes;
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
    private final AchievementService achievementService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService,
                       AchievementService achievementService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.achievementService = achievementService;
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
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setProvider("local");

        userRepository.save(user);
    }

    /**
     * Initiates the password-reset flow: generates a short-lived reset token,
     * builds the reset link, and sends it to the user's email (localized to {@code language}).
     * Silently does nothing when the email is unknown — avoids user enumeration.
     *
     * @param language the guest-selected UI language, passed through to localize the email.
     */
    @Transactional(readOnly = true)
    public void initiatePasswordReset(String email, String language) {
        userRepository.findByEmail(email)
                .filter(User::isEmailVerified)
                .ifPresent(user -> {
                    String token = jwtService.generateResetToken(user.getId());
                    String link = baseUrl + "/?reset=" + token;
                    emailService.sendPasswordResetLink(email, link, language);
                });
    }

    @Transactional(readOnly = true)
    public String getEmailByUserId(Long userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));
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
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        user.setUsername(username);
        userRepository.save(user);

        achievementService.recordAction(userId, "edit_profile");
    }

    /**
     * Sets the user's avatar icon. Value is restricted to a fixed set of
     * presets, validated at the controller-level DTO.
     */
    @Transactional
    public void updateAvatarIcon(Long userId, String avatarIcon) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        user.setAvatarIcon(avatarIcon);
        userRepository.save(user);

        achievementService.recordAction(userId, "edit_profile");
    }

    /**
     * Sets the user's interface language preference ("ru" or "en").
     */
    @Transactional
    public void updatePreferredLanguage(Long userId, String preferredLanguage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        user.setPreferredLanguage(preferredLanguage);
        userRepository.save(user);
    }

    /**
     * Sets the user's visual theme style. Value is restricted to a fixed set
     * of presets, validated at the controller-level DTO. "classic" is always
     * allowed; every other style must be unlocked via an achievement first
     * (see AchievementCatalog's theme-reward entries) — the achievement
     * table is the sole source of truth here, not a recomputation.
     */
    @Transactional
    public void updateThemeStyle(Long userId, String themeStyle) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        if (!themeStyle.equals("classic") && !achievementService.isRewardUnlocked(userId, "theme", themeStyle)) {
            throw new IllegalArgumentException(ApiCodes.THEME_LOCKED);
        }

        user.setThemeStyle(themeStyle);
        userRepository.save(user);

        // "explorer"'s change_theme action fires from the light/dark toggle instead
        // (see AchievementController.recordAppearanceToggle) — every non-classic
        // theme style is locked until an achievement unlocks it, so recording this
        // action here would be unreachable for a brand-new user: they can't switch
        // away from classic (nothing else is unlocked yet), and switching from
        // classic to classic is a client-side no-op that never even calls this method.
        achievementService.markActiveToday(userId);
    }
}
