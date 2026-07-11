package com.mkrasikoff.epigraph.service;

import com.mkrasikoff.epigraph.dto.ImportSharedQuoteResponse;
import com.mkrasikoff.epigraph.exception.QuoteLimitExceededException;
import com.mkrasikoff.epigraph.exception.QuoteNotFoundException;
import com.mkrasikoff.epigraph.exception.SharedQuoteNotFoundException;
import com.mkrasikoff.epigraph.model.Quote;
import com.mkrasikoff.epigraph.model.SharedQuote;
import com.mkrasikoff.epigraph.repository.QuoteRepository;
import com.mkrasikoff.epigraph.repository.SharedQuoteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedQuoteServiceTest {

    @Mock
    private SharedQuoteRepository sharedQuoteRepo;

    @Mock
    private QuoteRepository quoteRepo;

    @InjectMocks
    private SharedQuoteService sharedQuoteService;

    private static final Long OWNER_ID = 1L;
    private static final Long IMPORTER_ID = 2L;
    private static final Long QUOTE_ID = 10L;

    private Quote buildQuote() {
        Quote q = new Quote();
        q.setId(QUOTE_ID);
        q.setText("Original text");
        q.setAuthor("Author");
        q.setSource("Source");
        q.setTags("tag1,tag2");
        q.setUserId(OWNER_ID);
        return q;
    }

    private SharedQuote buildSharedQuote(Long id) {
        SharedQuote s = new SharedQuote();
        s.setId(id);
        s.setToken("tok123");
        s.setOwnerUserId(OWNER_ID);
        s.setSourceQuoteId(QUOTE_ID);
        s.setText("Original text");
        s.setAuthor("Author");
        s.setSource("Source");
        s.setTags("tag1,tag2");
        s.setCreatedAt(1000L);
        return s;
    }

    @Test
    @DisplayName("createOrGetLink: creates a new link snapshotting the quote's fields")
    void createOrGetLink_createsNewLink() {
        Quote quote = buildQuote();
        when(quoteRepo.findByIdAndUserId(QUOTE_ID, OWNER_ID)).thenReturn(Optional.of(quote));
        when(sharedQuoteRepo.findByOwnerUserIdAndSourceQuoteId(OWNER_ID, QUOTE_ID)).thenReturn(Optional.empty());
        when(sharedQuoteRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SharedQuote result = sharedQuoteService.createOrGetLink(QUOTE_ID, OWNER_ID);

        assertThat(result.getText()).isEqualTo("Original text");
        assertThat(result.getOwnerUserId()).isEqualTo(OWNER_ID);
        assertThat(result.getSourceQuoteId()).isEqualTo(QUOTE_ID);
        assertThat(result.getToken()).isNotBlank();
        verify(sharedQuoteRepo).save(any());
    }

    @Test
    @DisplayName("createOrGetLink: is idempotent — returns existing link instead of creating a new one")
    void createOrGetLink_returnsExistingLink() {
        Quote quote = buildQuote();
        SharedQuote existing = buildSharedQuote(5L);
        when(quoteRepo.findByIdAndUserId(QUOTE_ID, OWNER_ID)).thenReturn(Optional.of(quote));
        when(sharedQuoteRepo.findByOwnerUserIdAndSourceQuoteId(OWNER_ID, QUOTE_ID)).thenReturn(Optional.of(existing));

        SharedQuote result = sharedQuoteService.createOrGetLink(QUOTE_ID, OWNER_ID);

        assertThat(result).isSameAs(existing);
        verify(sharedQuoteRepo, never()).save(any());
    }

    @Test
    @DisplayName("createOrGetLink: throws when the quote doesn't belong to the caller")
    void createOrGetLink_throwsWhenNotOwned() {
        when(quoteRepo.findByIdAndUserId(QUOTE_ID, OWNER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sharedQuoteService.createOrGetLink(QUOTE_ID, OWNER_ID))
                .isInstanceOf(QuoteNotFoundException.class);
    }

    @Test
    @DisplayName("getPublic: throws SharedQuoteNotFoundException for unknown token")
    void getPublic_throwsWhenNotFound() {
        when(sharedQuoteRepo.findByToken("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sharedQuoteService.getPublic("missing"))
                .isInstanceOf(SharedQuoteNotFoundException.class);
    }

    @Test
    @DisplayName("importToCollection: copies the shared quote into the importer's collection")
    void importToCollection_createsCopy() {
        SharedQuote shared = buildSharedQuote(5L);
        when(sharedQuoteRepo.findByToken("tok123")).thenReturn(Optional.of(shared));
        when(quoteRepo.findBySharedQuoteIdAndUserId(5L, IMPORTER_ID)).thenReturn(Optional.empty());
        when(quoteRepo.countByUserId(IMPORTER_ID)).thenReturn(0L);
        when(quoteRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ImportSharedQuoteResponse result = sharedQuoteService.importToCollection("tok123", IMPORTER_ID);

        assertThat(result.isAlreadyImported()).isFalse();
        assertThat(result.getQuote().getText()).isEqualTo("Original text");
        assertThat(result.getQuote().getUserId()).isEqualTo(IMPORTER_ID);
        assertThat(result.getQuote().isManuallyAdded()).isFalse();
        assertThat(result.getQuote().getSharedQuoteId()).isEqualTo(5L);
        assertThat(result.getQuote().getSharedFromUserId()).isEqualTo(OWNER_ID);
        assertThat(result.getQuote().getImportedAt()).isNotNull();
    }

    @Test
    @DisplayName("importToCollection: second import of the same link returns the existing copy, no duplicate")
    void importToCollection_isIdempotentPerUser() {
        SharedQuote shared = buildSharedQuote(5L);
        Quote alreadyImported = buildQuote();
        alreadyImported.setUserId(IMPORTER_ID);
        alreadyImported.setSharedQuoteId(5L);
        when(sharedQuoteRepo.findByToken("tok123")).thenReturn(Optional.of(shared));
        when(quoteRepo.findBySharedQuoteIdAndUserId(5L, IMPORTER_ID)).thenReturn(Optional.of(alreadyImported));

        ImportSharedQuoteResponse result = sharedQuoteService.importToCollection("tok123", IMPORTER_ID);

        assertThat(result.isAlreadyImported()).isTrue();
        assertThat(result.getQuote()).isSameAs(alreadyImported);
        verify(quoteRepo, never()).save(any());
    }

    @Test
    @DisplayName("importToCollection: throws QuoteLimitExceededException when importer is at the quote cap")
    void importToCollection_throwsWhenLimitReached() {
        SharedQuote shared = buildSharedQuote(5L);
        when(sharedQuoteRepo.findByToken("tok123")).thenReturn(Optional.of(shared));
        when(quoteRepo.findBySharedQuoteIdAndUserId(5L, IMPORTER_ID)).thenReturn(Optional.empty());
        when(quoteRepo.countByUserId(IMPORTER_ID)).thenReturn(1000L);

        assertThatThrownBy(() -> sharedQuoteService.importToCollection("tok123", IMPORTER_ID))
                .isInstanceOf(QuoteLimitExceededException.class);

        verify(quoteRepo, never()).save(any());
    }
}
