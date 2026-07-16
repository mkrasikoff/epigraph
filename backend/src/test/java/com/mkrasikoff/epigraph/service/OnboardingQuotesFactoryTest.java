package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.Quote;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OnboardingQuotesFactoryTest {

    private static final long BASE = 1_000_000L;

    @Test
    @DisplayName("build: returns exactly 3 onboarding quotes for either language")
    void build_returnsThreeQuotes() {
        assertThat(OnboardingQuotesFactory.build("ru", BASE)).hasSize(3);
        assertThat(OnboardingQuotesFactory.build("en", BASE)).hasSize(3);
    }

    @Test
    @DisplayName("build(ru): quotes are in Russian, attributed to Epigraph and tagged инструкция")
    void build_russianSet() {
        assertThat(OnboardingQuotesFactory.build("ru", BASE))
                .allSatisfy(q -> {
                    assertThat(q.getAuthor()).isEqualTo("Epigraph");
                    assertThat(q.getTags()).isEqualTo("инструкция");
                    assertThat(q.getText()).isNotBlank();
                });
        assertThat(OnboardingQuotesFactory.build("ru", BASE).get(2).getText()).contains("Добро пожаловать");
    }

    @Test
    @DisplayName("build(en): quotes are in English, attributed to Epigraph and tagged guide")
    void build_englishSet() {
        assertThat(OnboardingQuotesFactory.build("en", BASE))
                .allSatisfy(q -> {
                    assertThat(q.getAuthor()).isEqualTo("Epigraph");
                    assertThat(q.getTags()).isEqualTo("guide");
                    assertThat(q.getText()).isNotBlank();
                });
        assertThat(OnboardingQuotesFactory.build("en", BASE).get(2).getText()).contains("Welcome to Epigraph");
    }

    @Test
    @DisplayName("build: unknown/null language falls back to the Russian set")
    void build_fallsBackToRussian() {
        assertThat(OnboardingQuotesFactory.build(null, BASE).get(0).getTags()).isEqualTo("инструкция");
        assertThat(OnboardingQuotesFactory.build("fr", BASE).get(0).getTags()).isEqualTo("инструкция");
    }

    @Test
    @DisplayName("build: quotes are ordered newest-first so the welcome card sorts to the top")
    void build_ordersWelcomeCardLast() {
        List<Quote> quotes = OnboardingQuotesFactory.build("en", BASE);

        // Descending added offsets: base+2, base+1, base — the welcome card is the last element
        // (lowest timestamp) and every quote carries a distinct, base-anchored timestamp.
        assertThat(quotes).extracting(Quote::getAdded).containsExactly(BASE + 2, BASE + 1, BASE);
    }

    @Test
    @DisplayName("build: does not assign a userId — that is the caller's job")
    void build_leavesUserIdUnset() {
        assertThat(OnboardingQuotesFactory.build("ru", BASE)).allSatisfy(q -> assertThat(q.getUserId()).isNull());
    }
}
