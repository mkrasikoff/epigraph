package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.EmailVerification;
import com.mkrasikoff.epigraph.repository.EmailVerificationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock private EmailVerificationRepository repo;
    @Mock private EmailService emailService;

    @InjectMocks
    private EmailVerificationService service;

    private EmailVerification buildVerification(String email, String code, boolean expired) {
        EmailVerification v = new EmailVerification();
        v.setEmail(email);
        v.setCode(code);
        v.setExpiresAt(expired
                ? System.currentTimeMillis() - 1000
                : System.currentTimeMillis() + 900_000);
        v.setUsed(false);
        return v;
    }

    @Test
    @DisplayName("sendCode: invalidates previous codes and saves new one")
    void sendCode_invalidatesPreviousAndSavesNew() {
        service.sendCode("user@mail.com", "en");

        verify(repo).invalidateAll("user@mail.com");
        verify(repo).save(any(EmailVerification.class));
    }

    @Test
    @DisplayName("sendCode: saved code is exactly 6 digits")
    void sendCode_savedCodeIsSixDigits() {
        ArgumentCaptor<EmailVerification> captor = ArgumentCaptor.forClass(EmailVerification.class);

        service.sendCode("user@mail.com", "en");

        verify(repo).save(captor.capture());
        String code = captor.getValue().getCode();
        assertThat(code).matches("\\d{6}");
    }

    @Test
    @DisplayName("sendCode: saved verification has correct email and future expiry")
    void sendCode_savedVerificationHasCorrectFields() {
        ArgumentCaptor<EmailVerification> captor = ArgumentCaptor.forClass(EmailVerification.class);

        service.sendCode("user@mail.com", "en");

        verify(repo).save(captor.capture());
        EmailVerification saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@mail.com");
        assertThat(saved.getExpiresAt()).isGreaterThan(System.currentTimeMillis());
        assertThat(saved.getCreatedAt()).isPositive();
    }

    @Test
    @DisplayName("sendCode: sends email with generated code")
    void sendCode_sendsEmail() {
        ArgumentCaptor<EmailVerification> captor = ArgumentCaptor.forClass(EmailVerification.class);

        service.sendCode("user@mail.com", "en");

        verify(repo).save(captor.capture());
        String code = captor.getValue().getCode();
        verify(emailService).sendVerificationCode("user@mail.com", code, "en");
    }

    @Test
    @DisplayName("verifyCode: marks code as used on success")
    void verifyCode_marksAsUsed() {
        EmailVerification v = buildVerification("user@mail.com", "123456", false);
        when(repo.findValidCode(eq("user@mail.com"), anyLong())).thenReturn(Optional.of(v));

        service.verifyCode("user@mail.com", "123456");

        assertThat(v.isUsed()).isTrue();
        verify(repo).save(v);
    }

    @Test
    @DisplayName("verifyCode: throws when no valid code exists")
    void verifyCode_throws_whenNoValidCode() {
        when(repo.findValidCode(eq("user@mail.com"), anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyCode("user@mail.com", "123456"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("INVALID_OR_EXPIRED_CODE");
    }

    @Test
    @DisplayName("verifyCode: throws when code does not match")
    void verifyCode_throws_whenCodeMismatch() {
        EmailVerification v = buildVerification("user@mail.com", "999999", false);
        when(repo.findValidCode(eq("user@mail.com"), anyLong())).thenReturn(Optional.of(v));

        assertThatThrownBy(() -> service.verifyCode("user@mail.com", "000000"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("INVALID_OR_EXPIRED_CODE");
    }

    @Test
    @DisplayName("verifyCode: does not mark as used when code mismatches")
    void verifyCode_doesNotMarkAsUsed_whenCodeMismatch() {
        EmailVerification v = buildVerification("user@mail.com", "999999", false);
        when(repo.findValidCode(eq("user@mail.com"), anyLong())).thenReturn(Optional.of(v));

        assertThatThrownBy(() -> service.verifyCode("user@mail.com", "000000"));

        assertThat(v.isUsed()).isFalse();
        verify(repo, never()).save(v);
    }
}
