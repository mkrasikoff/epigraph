package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private EmailService emailService;
    @Mock private AchievementService achievementService;

    @InjectMocks
    private UserService userService;

    private static final Long USER_ID = 1L;
    private static final String BASE_URL = "https://epigraph.app";

    private User buildUser(Long id, String email, boolean verified) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setPassword("encoded");
        u.setProvider("local");
        u.setEmailVerified(verified);
        return u;
    }

    @Test
    @DisplayName("deleteAccount: calls repository deleteById")
    void deleteAccount_callsRepository() {
        userService.deleteAccount(USER_ID);

        verify(userRepository).deleteById(USER_ID);
    }
    
    @Test
    @DisplayName("changePassword: encodes password and saves user")
    void changePassword_encodesAndSaves() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpass")).thenReturn("encoded_new");

        userService.changePassword(USER_ID, "newpass");

        assertThat(user.getPassword()).isEqualTo("encoded_new");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("changePassword: sets provider to local after password change")
    void changePassword_setsProviderToLocal() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        user.setProvider("google");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(any())).thenReturn("encoded");

        userService.changePassword(USER_ID, "newpass");

        assertThat(user.getProvider()).isEqualTo("local");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("changePassword: throws when user not found")
    void changePassword_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.changePassword(99L, "newpass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");
    }

    @Test
    @DisplayName("initiatePasswordReset: sends reset link for verified user")
    void initiatePasswordReset_sendsLink_forVerifiedUser() {
        ReflectionTestUtils.setField(userService, "baseUrl", BASE_URL);
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findByEmail("user@mail.com")).thenReturn(Optional.of(user));
        when(jwtService.generateResetToken(USER_ID)).thenReturn("reset-token");

        userService.initiatePasswordReset("user@mail.com", "en");

        verify(emailService).sendPasswordResetLink(
                eq("user@mail.com"),
                eq(BASE_URL + "/?reset=reset-token"),
                eq("en")
        );
    }

    @Test
    @DisplayName("initiatePasswordReset: does nothing for unverified user")
    void initiatePasswordReset_doesNothing_forUnverifiedUser() {
        User user = buildUser(USER_ID, "user@mail.com", false);
        when(userRepository.findByEmail("user@mail.com")).thenReturn(Optional.of(user));

        userService.initiatePasswordReset("user@mail.com", "en");

        verify(emailService, never()).sendPasswordResetLink(any(), any(), any());
        verify(jwtService, never()).generateResetToken(any());
    }

    @Test
    @DisplayName("initiatePasswordReset: does nothing for unknown email")
    void initiatePasswordReset_doesNothing_forUnknownEmail() {
        when(userRepository.findByEmail("ghost@mail.com")).thenReturn(Optional.empty());

        userService.initiatePasswordReset("ghost@mail.com", "en");

        verify(emailService, never()).sendPasswordResetLink(any(), any(), any());
    }

    @Test
    @DisplayName("getEmailByUserId: returns email for existing user")
    void getEmailByUserId_returnsEmail() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        String email = userService.getEmailByUserId(USER_ID);

        assertThat(email).isEqualTo("user@mail.com");
    }

    @Test
    @DisplayName("getEmailByUserId: throws when user not found")
    void getEmailByUserId_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getEmailByUserId(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");
    }

    @Test
    @DisplayName("findById: returns user when found")
    void findById_returnsUser_whenFound() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        Optional<User> result = userService.findById(USER_ID);

        assertThat(result).contains(user);
    }

    @Test
    @DisplayName("findById: returns empty when user not found")
    void findById_returnsEmpty_whenNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        Optional<User> result = userService.findById(99L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("updateUsername: sets username and saves user")
    void updateUsername_setsUsernameAndSaves() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateUsername(USER_ID, "newname");

        assertThat(user.getUsername()).isEqualTo("newname");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateUsername: allows non-unique username shared with another user")
    void updateUsername_allowsDuplicateUsername() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        user.setUsername("taken");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateUsername(USER_ID, "taken");

        assertThat(user.getUsername()).isEqualTo("taken");
        verify(userRepository).save(user);
        verify(userRepository, never()).existsByEmail(any());
    }

    @Test
    @DisplayName("updateUsername: throws when user not found")
    void updateUsername_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateUsername(99L, "newname"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateAvatarIcon: sets avatar icon and saves user")
    void updateAvatarIcon_setsIconAndSaves() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateAvatarIcon(USER_ID, "cat");

        assertThat(user.getAvatarIcon()).isEqualTo("cat");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateAvatarIcon: throws when user not found")
    void updateAvatarIcon_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateAvatarIcon(99L, "cat"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateAvatarIcon: throws AVATAR_LOCKED when a non-Plus user picks a Plus icon")
    void updateAvatarIcon_throws_whenPlusIconWithoutPlus() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.updateAvatarIcon(USER_ID, "frog"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("AVATAR_LOCKED");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateAvatarIcon: Plus user can set a Plus-exclusive icon")
    void updateAvatarIcon_allowsPlusIcon_forPlusUser() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        user.setPlusSince(1700000000000L);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateAvatarIcon(USER_ID, "frog");

        assertThat(user.getAvatarIcon()).isEqualTo("frog");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updatePreferredLanguage: sets language and saves user")
    void updatePreferredLanguage_setsLanguageAndSaves() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updatePreferredLanguage(USER_ID, "en");

        assertThat(user.getPreferredLanguage()).isEqualTo("en");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updatePreferredLanguage: throws when user not found")
    void updatePreferredLanguage_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updatePreferredLanguage(99L, "en"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateQuotesVisibility: saves the chosen visibility")
    void updateQuotesVisibility_savesValue() {
        User user = new User();
        user.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        userService.updateQuotesVisibility(1L, User.QUOTES_VISIBLE_ALL);

        assertThat(user.getQuotesVisibility()).isEqualTo(User.QUOTES_VISIBLE_ALL);
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateQuotesVisibility: throws when the user is missing")
    void updateQuotesVisibility_throwsWhenUserMissing() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateQuotesVisibility(1L, User.QUOTES_VISIBLE_NONE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(ApiCodes.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("new User: defaults to sharing only favourites with friends")
    void newUser_defaultsToFavoritesVisibility() {
        assertThat(new User().getQuotesVisibility()).isEqualTo(User.QUOTES_VISIBLE_FAVORITES);
    }

    @Test
    @DisplayName("updateThemeStyle: sets theme style and saves user when unlocked")
    void updateThemeStyle_setsThemeAndSaves_whenUnlocked() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(achievementService.isRewardUnlocked(USER_ID, "theme", "forest")).thenReturn(true);

        userService.updateThemeStyle(USER_ID, "forest");

        assertThat(user.getThemeStyle()).isEqualTo("forest");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateThemeStyle: allows classic without any achievement unlocked")
    void updateThemeStyle_allowsClassic_alwaysUnlocked() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateThemeStyle(USER_ID, "classic");

        assertThat(user.getThemeStyle()).isEqualTo("classic");
        verify(userRepository).save(user);
        verify(achievementService, never()).isRewardUnlocked(any(), any(), any());
    }

    @Test
    @DisplayName("updateThemeStyle: throws when theme not unlocked")
    void updateThemeStyle_throws_whenNotUnlocked() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(achievementService.isRewardUnlocked(USER_ID, "theme", "forest")).thenReturn(false);

        assertThatThrownBy(() -> userService.updateThemeStyle(USER_ID, "forest"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("THEME_LOCKED");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateThemeStyle: throws when user not found")
    void updateThemeStyle_throws_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateThemeStyle(99L, "forest"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("USER_NOT_FOUND");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateThemeStyle: allows a Plus theme when the account has Plus, without checking achievements")
    void updateThemeStyle_allowsPlusTheme_whenUserHasPlus() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        user.setPlusSince(1_700_000_000_000L);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        userService.updateThemeStyle(USER_ID, "noir");

        assertThat(user.getThemeStyle()).isEqualTo("noir");
        verify(userRepository).save(user);
        verify(achievementService, never()).isRewardUnlocked(any(), any(), any());
    }

    @Test
    @DisplayName("updateThemeStyle: rejects a Plus theme when the account has no Plus")
    void updateThemeStyle_throwsForPlusTheme_whenNoPlus() {
        User user = buildUser(USER_ID, "user@mail.com", true);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(achievementService.isRewardUnlocked(USER_ID, "theme", "noir")).thenReturn(false);

        assertThatThrownBy(() -> userService.updateThemeStyle(USER_ID, "noir"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("THEME_LOCKED");

        verify(userRepository, never()).save(any());
    }
}
