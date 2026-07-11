package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.exception.SharedQuoteNotFoundException;
import com.mkrasikoff.epigraph.model.SharedQuote;
import com.mkrasikoff.epigraph.service.SharedQuoteService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/**
 * Serves the public share page at GET /s/{token}. This is intentionally a plain
 * String-replace template (not a full templating engine) rendered outside
 * static/, because it's the one page that needs server-injected Open Graph tags
 * for link-preview crawlers — see TASK-125 plan for why the rest of the SPA
 * doesn't need this.
 */
@RestController
public class SharePageController {

    private static final Logger log = LoggerFactory.getLogger(SharePageController.class);

    private final SharedQuoteService sharedQuoteService;
    private final String template;

    public SharePageController(SharedQuoteService sharedQuoteService) {
        this.sharedQuoteService = sharedQuoteService;
        this.template = loadTemplate();
    }

    @GetMapping(value = "/s/{token}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> sharePage(@PathVariable String token, HttpServletRequest request) {
        String origin = request.getScheme() + "://" + request.getServerName()
                + (isDefaultPort(request) ? "" : ":" + request.getServerPort());
        String url = origin + "/s/" + token;

        try {
            SharedQuote shared = sharedQuoteService.getPublic(token);

            String title = shared.getAuthor() != null && !shared.getAuthor().isBlank()
                    ? shared.getAuthor() + " — Epigraph"
                    : "Epigraph";
            String description = truncate(shared.getText(), 200);

            String html = template
                    .replace("{{OG_TITLE}}", HtmlUtils.htmlEscape(title))
                    .replace("{{OG_DESCRIPTION}}", HtmlUtils.htmlEscape(description))
                    .replace("{{OG_URL}}", HtmlUtils.htmlEscape(url))
                    .replace("{{BODY}}", buildQuoteBody(shared, token));

            return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
        } catch (SharedQuoteNotFoundException e) {
            log.info("Share page requested for unknown token = {}", token);

            String html = template
                    .replace("{{OG_TITLE}}", "Epigraph")
                    .replace("{{OG_DESCRIPTION}}", "Ваши цитаты. Каждый день.")
                    .replace("{{OG_URL}}", HtmlUtils.htmlEscape(url))
                    .replace("{{BODY}}", buildNotFoundBody());

            return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_HTML).body(html);
        }
    }

    private String buildQuoteBody(SharedQuote shared, String token) {
        String text = HtmlUtils.htmlEscape(shared.getText()).replace("\n", "<br>");
        String author = shared.getAuthor() != null ? HtmlUtils.htmlEscape(shared.getAuthor()) : "";
        String source = shared.getSource() != null ? HtmlUtils.htmlEscape(shared.getSource()) : "";

        return """
                <div class="quote-card is-expanded">
                    <span class="quote-card-badge" data-i18n="shareBadge">Публичная</span>
                    <div class="quote-card-text-wrap"><div class="quote-card-text">%s</div></div>
                    <div class="quote-card-meta">
                        <div>
                            <span class="quote-card-author">%s</span>
                            <span class="quote-card-source">%s</span>
                        </div>
                    </div>
                </div>
                <button id="share-add-btn" class="btn-primary" data-token="%s" disabled></button>
                """.formatted(text, author, source, HtmlUtils.htmlEscape(token));
    }

    private String buildNotFoundBody() {
        return """
                <div class="empty-state">
                    <div data-i18n="shareNotFoundTitle">Ссылка не найдена</div>
                    <div data-i18n="shareNotFoundText">Эта цитата больше недоступна.</div>
                </div>
                """;
    }

    private boolean isDefaultPort(HttpServletRequest request) {
        int port = request.getServerPort();
        return ("https".equals(request.getScheme()) && port == 443)
                || ("http".equals(request.getScheme()) && port == 80);
    }

    private String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) return text;

        return text.substring(0, maxLength - 1).trim() + "…";
    }

    private String loadTemplate() {
        try {
            return new String(new ClassPathResource("share-template.html").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load share-template.html", e);
        }
    }
}
