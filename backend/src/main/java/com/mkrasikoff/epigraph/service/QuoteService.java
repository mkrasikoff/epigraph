package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.BatchImportResult;
import com.mkrasikoff.epigraph.dto.RejectedQuote;
import com.mkrasikoff.epigraph.exception.QuoteLimitExceededException;
import com.mkrasikoff.epigraph.exception.QuoteNotFoundException;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
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
     */
    private static final int MAX_QUOTES_PER_USER = 1000;

    private final QuoteRepository repo;
    private final Validator validator;

    public QuoteService(QuoteRepository repo, Validator validator) {
        this.repo = repo;
        this.validator = validator;
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
        if (repo.countByUserId(userId) >= MAX_QUOTES_PER_USER) {
            throw new QuoteLimitExceededException(MAX_QUOTES_PER_USER);
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
        long remainingSlots = MAX_QUOTES_PER_USER - repo.countByUserId(userId);
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
                rejected.add(new RejectedQuote(quote, List.of(QuoteLimitExceededException.buildMessage(MAX_QUOTES_PER_USER))));
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
     * Creates 3 onboarding instruction quotes for a newly registered user.
     * Called right after registration (local and OAuth2).
     */
    @Transactional
    public void createDefaultQuotes(Long userId) {
        long now = System.currentTimeMillis();

        List<Quote> defaults = List.of(
                buildDefaultQuote(
                        "⭐ Отмечайте любимые цитаты звёздочкой — они попадут в избранное. " +
                                "На вкладке «На сегодня» каждый день вас ждёт одна из ваших цитат. Удалите эти карточки, когда освоитесь.",
                        "Epigraph", null, "инструкция", now + 2),
                buildDefaultQuote(
                        "➕ Чтобы добавить цитату, перейдите в раздел «Добавить». " +
                                "Укажите текст, автора, источник и теги — это поможет находить нужное через поиск.",
                        "Epigraph", null, "инструкция", now + 1),
                buildDefaultQuote(
                        "👋 Добро пожаловать в Epigraph! Это ваше личное хранилище цитат. " +
                                "Сохраняйте фразы, которые вас вдохновляют, удивляют или заставляют думать.",
                        "Epigraph", null, "инструкция", now)
        );

        defaults.forEach(q -> {
            q.setUserId(userId);
            repo.save(q);
        });
    }

    private Quote buildDefaultQuote(String text, String author, String source, String tags, long added) {
        Quote q = new Quote();

        q.setText(text);
        q.setAuthor(author);
        q.setSource(source);
        q.setTags(tags);
        q.setAdded(added);

        return q;
    }
}
