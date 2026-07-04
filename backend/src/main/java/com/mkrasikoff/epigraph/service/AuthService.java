package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.User;
import com.mkrasikoff.epigraph.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
     */
    @Transactional
    public void register(String email, String rawPassword, String username) {
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
        user.setUsername(username);
        user.setCreatedAt(System.currentTimeMillis());
        user.setEmailVerified(false);
        userRepository.save(user);

        emailVerificationService.sendCode(email);
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
}
