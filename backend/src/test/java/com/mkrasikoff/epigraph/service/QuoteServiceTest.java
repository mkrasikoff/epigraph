package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.exception.QuoteNotFoundException;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuoteServiceTest {

    @Mock
    private QuoteRepository repo;

    @Mock
    private Validator validator;

    @InjectMocks
    private QuoteService quoteService;

    private static final Long USER_ID = 1L;

    private Quote buildQuote(Long id, String text) {
        Quote q = new Quote();
        q.setId(id);
        q.setText(text);
        q.setAuthor("Author");
        q.setUserId(USER_ID);
        return q;
    }

    @Test
    @DisplayName("findAll: returns quotes for given user")
    void findAll_returnsUserQuotes() {
        List<Quote> quotes = List.of(buildQuote(1L, "First"), buildQuote(2L, "Second"));
        when(repo.findByUserId(USER_ID)).thenReturn(quotes);

        List<Quote> result = quoteService.findAll(USER_ID);

        assertThat(result).hasSize(2);
        verify(repo).findByUserId(USER_ID);
    }

    @Test
    @DisplayName("findAll: returns empty list when user has no quotes")
    void findAll_returnsEmptyList() {
        when(repo.findByUserId(USER_ID)).thenReturn(Collections.emptyList());

        List<Quote> result = quoteService.findAll(USER_ID);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getQod: returns a quote when user has quotes")
    void getQod_returnsQuote() {
        List<Quote> quotes = List.of(buildQuote(1L, "Text A"), buildQuote(2L, "Text B"));
        when(repo.findByUserId(USER_ID)).thenReturn(quotes);

        Optional<Quote> result = quoteService.getQod(USER_ID);

        assertThat(result).isPresent();
    }

    @Test
    @DisplayName("getQod: returns empty when user has no quotes")
    void getQod_returnsEmpty_whenNoQuotes() {
        when(repo.findByUserId(USER_ID)).thenReturn(Collections.emptyList());

        Optional<Quote> result = quoteService.getQod(USER_ID);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getQod: same call on same day returns same quote (deterministic)")
    void getQod_isDeterministic() {
        List<Quote> quotes = List.of(buildQuote(1L, "A"), buildQuote(2L, "B"), buildQuote(3L, "C"));
        when(repo.findByUserId(USER_ID)).thenReturn(quotes);

        Optional<Quote> first  = quoteService.getQod(USER_ID);
        Optional<Quote> second = quoteService.getQod(USER_ID);

        assertThat(first).isPresent();
        assertThat(first.get().getId()).isEqualTo(second.get().getId());
    }

    @Test
    @DisplayName("save: sets userId and calls repo.save")
    void save_setsUserIdAndPersists() {
        Quote quote = buildQuote(null, "New quote");
        quote.setUserId(null);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Quote saved = quoteService.save(quote, USER_ID);

        assertThat(saved.getUserId()).isEqualTo(USER_ID);
        verify(repo).save(quote);
    }

    @Test
    @DisplayName("save: sets added timestamp when not provided")
    void save_setsAddedTimestamp_whenNull() {
        Quote quote = buildQuote(null, "Quote without timestamp");
        quote.setAdded(null);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Quote saved = quoteService.save(quote, USER_ID);

        assertThat(saved.getAdded()).isNotNull().isPositive();
    }

    @Test
    @DisplayName("save: preserves existing added timestamp")
    void save_preservesAddedTimestamp_whenAlreadySet() {
        Quote quote = buildQuote(null, "Quote with timestamp");
        long existingTimestamp = 1000000L;
        quote.setAdded(existingTimestamp);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Quote saved = quoteService.save(quote, USER_ID);

        assertThat(saved.getAdded()).isEqualTo(existingTimestamp);
    }

    @Test
    @DisplayName("saveAll: sets userId on every quote and calls repo.saveAll")
    void saveAll_setsUserIdOnEveryQuote() {
        List<Quote> quotes = List.of(buildQuote(null, "First"), buildQuote(null, "Second"));
        quotes.forEach(q -> q.setUserId(null));
        when(repo.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<Quote> saved = quoteService.saveAll(quotes, USER_ID);

        assertThat(saved).hasSize(2);
        assertThat(saved).allMatch(q -> USER_ID.equals(q.getUserId()));
        verify(repo).saveAll(quotes);
    }

    @Test
    @DisplayName("saveAll: sets added timestamp only for quotes missing one")
    void saveAll_setsAddedTimestamp_onlyWhenMissing() {
        Quote withoutTimestamp = buildQuote(null, "No timestamp");
        withoutTimestamp.setAdded(null);
        Quote withTimestamp = buildQuote(null, "Has timestamp");
        withTimestamp.setAdded(1000000L);
        when(repo.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<Quote> saved = quoteService.saveAll(List.of(withoutTimestamp, withTimestamp), USER_ID);

        assertThat(saved.get(0).getAdded()).isNotNull().isPositive();
        assertThat(saved.get(1).getAdded()).isEqualTo(1000000L);
    }

    @Test
    @DisplayName("saveAll: skips quotes that fail validation instead of rejecting the whole batch")
    void saveAll_skipsInvalidQuotes() {
        Quote valid = buildQuote(null, "Valid quote");
        Quote invalid = buildQuote(null, "Too long, pretend");
        @SuppressWarnings("unchecked")
        ConstraintViolation<Quote> violation = mock(ConstraintViolation.class);
        when(validator.validate(valid)).thenReturn(Collections.emptySet());
        when(validator.validate(invalid)).thenReturn(Set.of(violation));
        when(repo.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<Quote> saved = quoteService.saveAll(List.of(valid, invalid), USER_ID);

        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getText()).isEqualTo("Valid quote");
        verify(repo).saveAll(List.of(valid));
    }

    @Test
    @DisplayName("update: updates fields of existing quote")
    void update_updatesFields() {
        Quote existing = buildQuote(1L, "Old text");
        Quote incoming = buildQuote(1L, "New text");
        incoming.setAuthor("New Author");
        incoming.setSource("New Source");
        incoming.setTags("tag1,tag2");
        incoming.setFav(true);

        when(repo.findByIdAndUserId(1L, USER_ID)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Quote result = quoteService.update(1L, incoming, USER_ID);

        assertThat(result.getText()).isEqualTo("New text");
        assertThat(result.getAuthor()).isEqualTo("New Author");
        assertThat(result.isFav()).isTrue();
        verify(repo).save(existing);
    }

    @Test
    @DisplayName("update: throws QuoteNotFoundException when quote not found")
    void update_throws_whenNotFound() {
        when(repo.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> quoteService.update(99L, new Quote(), USER_ID))
                .isInstanceOf(QuoteNotFoundException.class);
    }

    @Test
    @DisplayName("deleteById: deletes existing quote")
    void deleteById_deletesQuote() {
        when(repo.existsByIdAndUserId(1L, USER_ID)).thenReturn(true);

        quoteService.deleteById(1L, USER_ID);

        verify(repo).deleteByIdAndUserId(1L, USER_ID);
    }

    @Test
    @DisplayName("deleteById: throws QuoteNotFoundException when quote not found")
    void deleteById_throws_whenNotFound() {
        when(repo.existsByIdAndUserId(99L, USER_ID)).thenReturn(false);

        assertThatThrownBy(() -> quoteService.deleteById(99L, USER_ID))
                .isInstanceOf(QuoteNotFoundException.class);
    }

    @Test
    @DisplayName("deleteAll: calls repo.deleteAllByUserId")
    void deleteAll_callsRepo() {
        quoteService.deleteAll(USER_ID);

        verify(repo).deleteAllByUserId(USER_ID);
    }

    @Test
    @DisplayName("createDefaultQuotes: saves exactly 3 quotes for new user")
    void createDefaultQuotes_savesThreeQuotes() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        quoteService.createDefaultQuotes(USER_ID);

        verify(repo, times(3)).save(any(Quote.class));
    }

    @Test
    @DisplayName("createDefaultQuotes: all saved quotes have correct userId")
    void createDefaultQuotes_setsCorrectUserId() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        quoteService.createDefaultQuotes(USER_ID);

        verify(repo, times(3)).save(argThat(q -> USER_ID.equals(q.getUserId())));
    }
}
