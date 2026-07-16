package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.model.Quote;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OnboardingQuotesFactoryTest {

    private static final long BASE = 1_000_000L;

    @Test
    @DisplayName("build: returns exactly 3 onboarding quotes")
    void build_returnsThreeQuotes() {
        assertThat(OnboardingQuotesFactory.build(BASE)).hasSize(3);
    }

    @Test
    @DisplayName("build: every quote is attributed to Epigraph and tagged as an instruction")
    void build_hasConsistentAuthorAndTag() {
        assertThat(OnboardingQuotesFactory.build(BASE))
                .allSatisfy(q -> {
                    assertThat(q.getAuthor()).isEqualTo("Epigraph");
                    assertThat(q.getTags()).isEqualTo("инструкция");
                    assertThat(q.getText()).isNotBlank();
                });
    }

    @Test
    @DisplayName("build: quotes are ordered newest-first so the welcome card sorts to the top")
    void build_ordersWelcomeCardLast() {
        List<Quote> quotes = OnboardingQuotesFactory.build(BASE);

        // Descending added offsets: base+2, base+1, base — the welcome card is the last element
        // (lowest timestamp) and every quote carries a distinct, base-anchored timestamp.
        assertThat(quotes).extracting(Quote::getAdded).containsExactly(BASE + 2, BASE + 1, BASE);
        assertThat(quotes.get(2).getText()).contains("Добро пожаловать");
    }

    @Test
    @DisplayName("build: does not assign a userId — that is the caller's job")
    void build_leavesUserIdUnset() {
        assertThat(OnboardingQuotesFactory.build(BASE)).allSatisfy(q -> assertThat(q.getUserId()).isNull());
    }
}
