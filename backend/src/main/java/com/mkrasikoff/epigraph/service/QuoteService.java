package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.quote.BatchImportResult;
import com.mkrasikoff.epigraph.dto.quote.RejectedQuote;
import com.mkrasikoff.epigraph.exception.ApiCodes;
import com.mkrasikoff.epigraph.exception.QuoteLimitExceededException;
import com.mkrasikoff.epigraph.exception.QuoteNotFoundException;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.UserRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class QuoteService {

    /**
     * Personal-app safety cap — keeps a single account from growing unbounded.
     * Epigraph Plus raises it (TASK-132); see {@link #maxQuotesFor(Long)}.
     */
    private static final int FREE_MAX_QUOTES_PER_USER = 1000;
    private static final int PLUS_MAX_QUOTES_PER_USER = 5000;

    private final QuoteRepository repo;
    private final UserRepository userRepo;
    private final Validator validator;

    public QuoteService(QuoteRepository repo, UserRepository userRepo, Validator validator) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.validator = validator;
    }

    /**
     * The per-account quote cap for a user — 5000 for Epigraph Plus accounts,
     * 1000 otherwise. A missing user (shouldn't happen for an authenticated
     * request) falls back to the free cap.
     */
    private int maxQuotesFor(Long userId) {
        boolean plus = userRepo.findById(userId).map(u -> u.getPlusSince() != null).orElse(false);
        return plus ? PLUS_MAX_QUOTES_PER_USER : FREE_MAX_QUOTES_PER_USER;
    }

    @Transactional(readOnly = true)
    public List<Quote> findAll(Long userId) {
        return repo.findByUserId(userId);
    }

    /**
     * Returns the Quote of the Day for a user — deterministic, date-based.
     * Uses quotes sorted by ID (creation order) so adding new quotes doesn't
     * shift today's selection.
     */
    @Transactional(readOnly = true)
    public Optional<Quote> getQod(Long userId) {
        List<Quote> sorted = repo.findByUserId(userId).stream()
                .sorted(Comparator.comparingLong(Quote::getId))
                .toList();

        if (sorted.isEmpty()) return Optional.empty();

        // Same deterministic hash as the frontend (date string → int)
        String today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Moscow")).toString(); // "2026-04-25"
        int hash = 0;
        for (char c : today.toCharArray()) hash = 31 * hash + c;

        return Optional.of(sorted.get(Math.abs(hash) % sorted.size()));
    }

    @Transactional
    public Quote save(Quote quote, Long userId) {
        if (repo.countByUserId(userId) >= maxQuotesFor(userId)) {
            throw new QuoteLimitExceededException();
        }

        if (quote.getAdded() == null) {
            quote.setAdded(System.currentTimeMillis());
        }

        quote.setUserId(userId);
        quote.setManuallyAdded(true);

        return repo.save(quote);
    }

    /**
     * Saves a batch of quotes in a single transaction — used by bulk imports so a large
     * import doesn't pay a separate transaction/connection-checkout cost per quote.
     *
     * Validates each quote individually and reports failures back (rather than rejecting
     * the whole batch, the way @Valid on a List would) — a single overly long quote
     * shouldn't take 19 valid ones down with it, and the caller can show/recover them.
     * Quotes beyond the per-account limit are reported the same way, as rejected items.
     */
    @Transactional
    public BatchImportResult saveAll(List<Quote> quotes, Long userId) {
        long now = System.currentTimeMillis();
        long remainingSlots = maxQuotesFor(userId) - repo.countByUserId(userId);
        List<Quote> valid = new ArrayList<>();
        List<RejectedQuote> rejected = new ArrayList<>();

        for (Quote quote : quotes) {
            if (quote.getAdded() == null) {
                quote.setAdded(now);
            }

            quote.setUserId(userId);

            Set<ConstraintViolation<Quote>> violations = validator.validate(quote);
            if (!violations.isEmpty()) {
                rejected.add(new RejectedQuote(quote, violations.stream().map(ConstraintViolation::getMessage).toList()));
                continue;
            }

            if (remainingSlots <= 0) {
                rejected.add(new RejectedQuote(quote, List.of(ApiCodes.QUOTE_LIMIT_EXCEEDED)));
                continue;
            }

            valid.add(quote);
            remainingSlots--;
        }

        return new BatchImportResult(repo.saveAll(valid), rejected);
    }

    @Transactional
    public Quote update(Long id, Quote incoming, Long userId) {
        Quote existing = repo.findByIdAndUserId(id, userId).orElseThrow(() -> new QuoteNotFoundException(id));

        existing.setText(incoming.getText());
        existing.setAuthor(incoming.getAuthor());
        existing.setSource(incoming.getSource());
        existing.setTags(incoming.getTags());
        existing.setFav(incoming.isFav());

        return repo.save(existing);
    }

    @Transactional
    public void deleteById(Long id, Long userId) {
        if (!repo.existsByIdAndUserId(id, userId)) throw new QuoteNotFoundException(id);

        repo.deleteByIdAndUserId(id, userId);
    }

    @Transactional
    public void deleteAll(Long userId) {
        repo.deleteAllByUserId(userId);
    }

    /**
     * Creates the onboarding instruction quotes for a newly registered user, localized to their
     * preferred language. Called right after registration (local and OAuth2). The seed content
     * itself lives in {@link OnboardingQuotesFactory} — this method only stamps each with the
     * owner and persists it.
     *
     * @param language the account's preferred language ("en" for English; anything else → Russian).
     */
    @Transactional
    public void createDefaultQuotes(Long userId, String language) {
        OnboardingQuotesFactory.build(language, System.currentTimeMillis()).forEach(q -> {
            q.setUserId(userId);
            repo.save(q);
        });
    }
}
