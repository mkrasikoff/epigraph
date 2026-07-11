package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.ImportSharedQuoteResponse;
import com.mkrasikoff.epigraph.exception.QuoteLimitExceededException;
import com.mkrasikoff.epigraph.exception.QuoteNotFoundException;
import com.mkrasikoff.epigraph.exception.SharedQuoteNotFoundException;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.model.SharedQuote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.SharedQuoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SharedQuoteService {

    /**
     * Same personal-app safety cap as QuoteService — importing a shared quote
     * still counts against the importer's own quote limit.
     */
    private static final int MAX_QUOTES_PER_USER = 1000;

    private final SharedQuoteRepository sharedQuoteRepo;
    private final QuoteRepository quoteRepo;

    public SharedQuoteService(SharedQuoteRepository sharedQuoteRepo, QuoteRepository quoteRepo) {
        this.sharedQuoteRepo = sharedQuoteRepo;
        this.quoteRepo = quoteRepo;
    }

    /**
     * Idempotent: a second "Share" click on the same quote returns the same
     * link/token instead of minting a new one.
     */
    @Transactional
    public SharedQuote createOrGetLink(Long quoteId, Long ownerUserId) {
        Quote quote = quoteRepo.findByIdAndUserId(quoteId, ownerUserId)
                .orElseThrow(() -> new QuoteNotFoundException(quoteId));

        return sharedQuoteRepo.findByOwnerUserIdAndSourceQuoteId(ownerUserId, quoteId)
                .orElseGet(() -> {
                    SharedQuote shared = new SharedQuote();

                    shared.setToken(UUID.randomUUID().toString().replace("-", ""));
                    shared.setOwnerUserId(ownerUserId);
                    shared.setSourceQuoteId(quoteId);
                    shared.setText(quote.getText());
                    shared.setAuthor(quote.getAuthor());
                    shared.setSource(quote.getSource());
                    shared.setTags(quote.getTags());
                    shared.setCreatedAt(System.currentTimeMillis());

                    return sharedQuoteRepo.save(shared);
                });
    }

    @Transactional(readOnly = true)
    public SharedQuote getPublic(String token) {
        return sharedQuoteRepo.findByToken(token)
                .orElseThrow(() -> new SharedQuoteNotFoundException(token));
    }

    /**
     * Copies a shared quote into the importer's own collection. A given user can
     * import a given link at most once — a repeat call returns the previously
     * imported copy instead of creating a duplicate.
     */
    @Transactional
    public ImportSharedQuoteResponse importToCollection(String token, Long importerUserId) {
        SharedQuote shared = getPublic(token);

        Quote existing = quoteRepo.findBySharedQuoteIdAndUserId(shared.getId(), importerUserId).orElse(null);
        if (existing != null) {
            return new ImportSharedQuoteResponse(existing, true);
        }

        if (quoteRepo.countByUserId(importerUserId) >= MAX_QUOTES_PER_USER) {
            throw new QuoteLimitExceededException(MAX_QUOTES_PER_USER);
        }

        Quote quote = new Quote();
        quote.setText(shared.getText());
        quote.setAuthor(shared.getAuthor());
        quote.setSource(shared.getSource());
        quote.setTags(shared.getTags());
        quote.setUserId(importerUserId);
        quote.setManuallyAdded(false);
        quote.setAdded(System.currentTimeMillis());
        quote.setSharedQuoteId(shared.getId());
        quote.setSharedFromUserId(shared.getOwnerUserId());
        quote.setImportedAt(System.currentTimeMillis());

        return new ImportSharedQuoteResponse(quoteRepo.save(quote), false);
    }
}
