package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.exception.EmailNotVerifiedException;
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
     *
     * @param language the guest-selected UI language, passed through so the verification email is
     *                 localized ("en" → English). The account's own preferredLanguage is persisted
     *                 later, in verify().
     */
    @Transactional
    public void register(String email, String rawPassword, String language) {
        userRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.isEmailVerified()) {
                throw new IllegalArgumentException(ApiCodes.EMAIL_ALREADY_REGISTERED);
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

        emailVerificationService.sendCode(email, language);
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
     * Completes registration: validates the code, marks the user as verified, creates default
     * quotes (localized to the guest's chosen language), and returns a JWT.
     *
     * @param language the guest-selected UI language, carried over from the client (the
     *                 {@code epigraph_lang} cookie). "en" seeds an English account + English
     *                 onboarding quotes; anything else keeps the Russian default. Persisting it
     *                 here also makes the account language correct from creation, so the client's
     *                 later syncPreferredLanguage() is a no-op instead of a visible reset.
     */
    @Transactional
    public String verify(String email, String code, String language) {
        emailVerificationService.verifyCode(email, code);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(ApiCodes.USER_NOT_FOUND));

        user.setEmailVerified(true);
        if ("en".equals(language)) {
            user.setPreferredLanguage("en");
        }
        userRepository.save(user);

        quoteService.createDefaultQuotes(user.getId(), user.getPreferredLanguage());

        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    /**
     * Resends a verification code if the user exists and is not yet verified.
     * Silently does nothing if the email is unknown — avoids user enumeration.
     *
     * @param language the guest-selected UI language, passed through to localize the email.
     */
    @Transactional
    public void resendCode(String email, String language) {
        userRepository.findByEmail(email)
                .filter(u -> !u.isEmailVerified())
                .ifPresent(u -> emailVerificationService.sendCode(email, language));
    }

    /**
     * Authenticates a local (email + password) login.
     *
     * @return a JWT on success, or {@code null} when the email is unknown or the password is wrong
     *         (a single indistinguishable failure — no user enumeration).
     * @throws com.mkrasikoff.epigraph.exception.EmailNotVerifiedException when the credentials are
     *         correct but the account's email was never verified. Checked only after the password
     *         matches, so it never leaks that an email is registered. In the normal flow this can't
     *         happen (verify() is the only way a local account gets a usable session), but it lets a
     *         legacy/manually-created unverified account recover via the resend+verify flow instead
     *         of being stuck on a generic "wrong credentials".
     */
    @Transactional(readOnly = true)
    public String login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(rawPassword, user.getPassword())) {
            return null;
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException(email);
        }
        return jwtService.generateToken(user.getId(), user.getEmail());
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
     *                          username policy, falling back to the email-derived name when
     *                          nothing usable remains (e.g. a fully Cyrillic display name).
     * @param language          the guest-selected UI language carried over from the client (the
     *                          {@code epigraph_lang} cookie, present on the OAuth callback). "en"
     *                          seeds an English account + English onboarding quotes; anything else
     *                          keeps the Russian default.
     */
    @Transactional
    public User provisionOAuthUser(String email, String provider, String providerId, String suggestedUsername, String language) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return existing.get();
        }

        User user = new User();
        user.setEmail(email);
        user.setProvider(provider);
        user.setProviderId(providerId);
        // Falling back to the email-derived name matters more than it looks: every
        // user must end up findable in friend search (TASK-129), and SQL LIKE never
        // matches NULL, so a null username makes an account permanently unsearchable.
        // A provider display name in Cyrillic sanitizes down to nothing, which makes
        // this the common path for Google sign-ins here, not an edge case.
        String username = sanitizeUsername(suggestedUsername);
        user.setUsername(username != null ? username : deriveUsername(email));
        user.setCreatedAt(System.currentTimeMillis());
        if ("en".equals(language)) {
            user.setPreferredLanguage("en");
        }
        user = userRepository.save(user);

        quoteService.createDefaultQuotes(user.getId(), user.getPreferredLanguage());

        return user;
    }

    /**
     * Cleans up a name pulled from an OAuth provider so it fits the username constraints
     * (3–20 chars, letters/digits/underscore only). Returns null when nothing usable is left;
     * the caller substitutes the email-derived name so the account is never left nameless.
     */
    private String sanitizeUsername(String raw) {
        if (raw == null || raw.isBlank()) return null;

        String cleaned = raw.trim().replaceAll("[^a-zA-Z0-9_]", "");
        if (cleaned.length() > 20) cleaned = cleaned.substring(0, 20);

        return cleaned.length() >= 3 ? cleaned : null;
    }
}
