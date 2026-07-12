package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.ImportSharedQuoteResponse;
import com.mkrasikoff.epigraph.dto.PublicSharedQuoteResponse;
import com.mkrasikoff.epigraph.dto.SharedQuoteLinkResponse;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.model.SharedQuote;
import com.mkrasikoff.epigraph.service.AchievementService;
import com.mkrasikoff.epigraph.service.SharedQuoteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SharedQuoteController {

    private static final Logger log = LoggerFactory.getLogger(SharedQuoteController.class);

    private final SharedQuoteService sharedQuoteService;
    private final AchievementService achievementService;

    public SharedQuoteController(SharedQuoteService sharedQuoteService,
                                  AchievementService achievementService) {
        this.sharedQuoteService = sharedQuoteService;
        this.achievementService = achievementService;
    }

    @PostMapping("/api/quotes/{id}/share")
    public SharedQuoteLinkResponse share(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        SharedQuote shared = sharedQuoteService.createOrGetLink(id, userId);

        log.info("Share link ready — quoteId = {}, token = {}", id, shared.getToken());

        return new SharedQuoteLinkResponse(shared.getToken());
    }

    @GetMapping("/api/shared/{token}")
    public PublicSharedQuoteResponse getShared(@PathVariable String token, @AuthenticationPrincipal Long userId) {
        SharedQuote shared = sharedQuoteService.getPublic(token);

        Quote existing = sharedQuoteService.findExistingCopy(shared, userId).orElse(null);

        return new PublicSharedQuoteResponse(
                shared.getText(), shared.getAuthor(), shared.getSource(), shared.getTags(),
                shared.getCreatedAt(), existing != null, existing != null ? existing.getId() : null);
    }

    @PostMapping("/api/shared/{token}/import")
    @ResponseStatus(HttpStatus.CREATED)
    public ImportSharedQuoteResponse importShared(@PathVariable String token, @AuthenticationPrincipal Long userId) {
        ImportSharedQuoteResponse result = sharedQuoteService.importToCollection(token, userId);

        if (!result.isAlreadyImported()) {
            achievementService.recordAction(userId, "import_quotes");
            achievementService.markActiveToday(userId);
            achievementService.evaluate(userId);
        }

        log.info("Shared quote import — token = {}, alreadyImported = {}", token, result.isAlreadyImported());

        return result;
    }
}
