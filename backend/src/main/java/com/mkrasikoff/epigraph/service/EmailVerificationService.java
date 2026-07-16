package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.ErrorCodes;
import com.mkrasikoff.epigraph.model.EmailVerification;
import com.mkrasikoff.epigraph.repository.EmailVerificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
public class EmailVerificationService {

    private static final long CODE_TTL_MS = 15 * 60 * 1000L; // 15 minutes
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmailVerificationRepository repo;
    private final EmailService emailService;

    public EmailVerificationService(EmailVerificationRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }

    /**
     * Generates a 6-digit code, invalidates previous codes for this email,
     * saves the new one, and sends it via email localized to {@code language}.
     *
     * @param language the guest-selected UI language, passed through to the email ("en" → English).
     */
    @Transactional
    public void sendCode(String email, String language) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));

        repo.invalidateAll(email);

        EmailVerification verification = new EmailVerification();
        verification.setEmail(email);
        verification.setCode(code);
        verification.setExpiresAt(System.currentTimeMillis() + CODE_TTL_MS);
        verification.setCreatedAt(System.currentTimeMillis());
        repo.save(verification);

        emailService.sendVerificationCode(email, code, language);
    }

    /**
     * Validates the code for the given email.
     * Marks it as used on success.
     * @throws IllegalArgumentException if the code is invalid or expired.
     */
    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification verification = repo
                .findValidCode(email, System.currentTimeMillis())
                .orElseThrow(() -> new IllegalArgumentException(ErrorCodes.INVALID_OR_EXPIRED_CODE));

        if (!verification.getCode().equals(code)) {
            throw new IllegalArgumentException(ErrorCodes.INVALID_OR_EXPIRED_CODE);
        }

        verification.setUsed(true);
        repo.save(verification);
    }
}
