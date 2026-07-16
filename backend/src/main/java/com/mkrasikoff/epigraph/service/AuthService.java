package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final QuoteService quoteService;
    private final EmailVerificationService emailVerificationService;
    private final EntityManager entityManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       QuoteService quoteService,
                       EmailVerificationService emailVerificationService,
                       EntityManager entityManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.quoteService = quoteService;
        this.emailVerificationService = emailVerificationService;
        this.entityManager = entityManager;
    }

    /**
     * Initiates registration: saves an unverified user and sends a verification code.
     * Does NOT return a JWT — the client must call verify() to complete registration.
     * Username is no longer collected at this step (see TASK-81) — a default derived from
     * the email local part is set here, and the client offers to change it (along with the
     * avatar icon) in a profile-setup modal shown right after verify() succeeds.
     */
    @Transactional
    public void register(String email, String rawPassword) {
        userRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.isEmailVerified()) {
                throw new IllegalArgumentException("Этот email уже зарегистрирован");
            }
            // Unverified user — delete stale record and flush immediately
            // so the subsequent INSERT does not hit the unique constraint
            userRepository.delete(existing);
        });
        userRepository.flush();
        entityManager.clear();

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setProvider("local");
        user.setUsername(deriveUsername(email));
        user.setCreatedAt(System.currentTimeMillis());
        user.setEmailVerified(false);
        userRepository.save(user);

        emailVerificationService.sendCode(email);
    }

    /**
     * Derives a default username from the local part of an email address (before the "@"),
     * stripped to the allowed charset and padded/truncated to fit the 3–20 char bound —
     * always produces a valid username per {@code UpdateUsernameRequest}'s pattern, even for
     * short or punctuation-heavy local parts (e.g. "a@x.com" -&gt; "a__").
     */
    private String deriveUsername(String email) {
        String localPart = email.substring(0, email.indexOf('@'));
        String sanitized = localPart.replaceAll("[^a-zA-Z0-9_]", "");

        if (sanitized.length() > 20) {
            sanitized = sanitized.substring(0, 20);
        }
        while (sanitized.length() < 3) {
            sanitized += "_";
        }

        return sanitized;
    }

    /**
     * Completes registration: validates the code, marks the user as verified,
     * creates default quotes, and returns a JWT.
     */
    @Transactional
    public String verify(String email, String code) {
        emailVerificationService.verifyCode(email, code);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));

        user.setEmailVerified(true);
        userRepository.save(user);

        quoteService.createDefaultQuotes(user.getId());

        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    /**
     * Resends a verification code if the user exists and is not yet verified.
     * Silently does nothing if the email is unknown — avoids user enumeration.
     */
    @Transactional
    public void resendCode(String email) {
        userRepository.findByEmail(email)
                .filter(u -> !u.isEmailVerified())
                .ifPresent(u -> emailVerificationService.sendCode(email));
    }

    @Transactional(readOnly = true)
    public String login(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(User::isEmailVerified)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> jwtService.generateToken(user.getId(), user.getEmail()))
                .orElse(null);
    }

    /**
     * Provisions an OAuth2 (Google/Yandex) user: returns the account already registered under
     * this email if one exists, otherwise creates a fresh account, seeds its onboarding quotes,
     * and returns it. This mirrors the local register()+verify() outcome (a usable account with
     * default quotes) for the OAuth path, keeping {@code OAuth2SuccessHandler} a thin web adapter
     * that only extracts provider attributes and issues the redirect. OAuth accounts are verified
     * on creation via the {@code emailVerified = true} entity default — the provider vouches for
     * the address.
     *
     * @param suggestedUsername raw display name pulled from the provider; sanitized here to the
     *                          username policy (may resolve to null when nothing usable remains,
     *                          in which case the client shows a fallback).
     */
    @Transactional
    public User provisionOAuthUser(String email, String provider, String providerId, String suggestedUsername) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return existing.get();
        }

        User user = new User();
        user.setEmail(email);
        user.setProvider(provider);
        user.setProviderId(providerId);
        user.setUsername(sanitizeUsername(suggestedUsername));
        user.setCreatedAt(System.currentTimeMillis());
        user = userRepository.save(user);

        quoteService.createDefaultQuotes(user.getId());

        return user;
    }

    /**
     * Cleans up a name pulled from an OAuth provider so it fits the username constraints
     * (3–20 chars, letters/digits/underscore only). Returns null when nothing usable is left —
     * the client will then show a fallback.
     */
    private String sanitizeUsername(String raw) {
        if (raw == null || raw.isBlank()) return null;

        String cleaned = raw.trim().replaceAll("[^a-zA-Z0-9_]", "");
        if (cleaned.length() > 20) cleaned = cleaned.substring(0, 20);

        return cleaned.length() >= 3 ? cleaned : null;
    }
}
