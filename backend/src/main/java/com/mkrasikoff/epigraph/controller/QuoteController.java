package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.quote.BatchImportResult;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.QuoteService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/quotes")
public class QuoteController {

    private static final Logger log = LoggerFactory.getLogger(QuoteController.class);

    private final QuoteService service;
    private final AchievementService achievementService;

    public QuoteController(QuoteService service, AchievementService achievementService) {
        this.service = service;
        this.achievementService = achievementService;
    }

    @GetMapping
    public List<Quote> getAll(@AuthenticationPrincipal Long userId) {
        List<Quote> quotes = service.findAll(userId);

        log.info("Fetching user quotes — found {}", quotes.size());

        return quotes;
    }

    @GetMapping("/qod")
    public ResponseEntity<Quote> getQod(@AuthenticationPrincipal Long userId) {
        log.info("Fetching QOD for user");

        return service.getQod(userId)
                .map(quote -> {
                    log.info("QOD resolved: quoteId = {}", quote.getId());

                    return ResponseEntity.ok(quote);
                })
                .orElseGet(() -> {
                    log.info("No quotes found for user, returning 204");

                    return ResponseEntity.noContent().build();
                });
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Quote create(@Valid @RequestBody Quote quote,
                        @AuthenticationPrincipal Long userId) {
        Quote saved = service.save(quote, userId);

        achievementService.recordAction(userId, "add_quote");
        achievementService.markActiveToday(userId);
        achievementService.evaluate(userId);

        log.info("Quote created — id = {}", saved.getId());

        return saved;
    }

    @PostMapping("/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public BatchImportResult createBatch(@RequestBody List<Quote> quotes,
                                         @AuthenticationPrincipal Long userId) {
        BatchImportResult result = service.saveAll(quotes, userId);

        if (!result.getSaved().isEmpty()) {
            achievementService.recordAction(userId, "import_quotes");
            achievementService.markActiveToday(userId);
            achievementService.evaluate(userId);
        }

        log.info("Batch quotes created — saved = {}, rejected = {}", result.getSaved().size(), result.getRejected().size());

        return result;
    }

    @PutMapping("/{id}")
    public Quote update(@PathVariable Long id,
                        @Valid @RequestBody Quote quote,
                        @AuthenticationPrincipal Long userId) {
        Quote updated = service.update(id, quote, userId);

        if (updated.isFav()) {
            achievementService.recordAction(userId, "favorite_quote");
        }
        achievementService.markActiveToday(userId);
        achievementService.evaluate(userId);

        log.info("Quote updated — id = {}, fav = {}", id, updated.isFav());

        return updated;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,
                       @AuthenticationPrincipal Long userId) {
        service.deleteById(id, userId);

        log.info("Quote deleted — id = {}", id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(@AuthenticationPrincipal Long userId) {
        service.deleteAll(userId);

        log.info("All user quotes deleted for userId = {}", userId);
    }
}
