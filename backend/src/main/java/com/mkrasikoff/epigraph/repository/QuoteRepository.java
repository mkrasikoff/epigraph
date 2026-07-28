package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, Long> {

    List<Quote> findByUserId(Long userId);

    long countByUserId(Long userId);

    Optional<Quote> findByIdAndUserId(Long id, Long userId);

    boolean existsByIdAndUserId(Long id, Long userId);

    void deleteByIdAndUserId(Long id, Long userId);

    void deleteAllByUserId(Long userId);

    long countByUserIdAndManuallyAddedTrue(Long userId);

    /**
     * Unlike the other count*ManuallyAdded* queries, favorites intentionally
     * count every favorited quote regardless of manuallyAdded — favoriting an
     * imported quote is still a real curation action by the user, unlike
     * "added N quotes" or "N distinct authors", which reward hand-entering
     * content and would be trivially gamed by importing many quotes at once.
     * See AchievementService.evaluate()'s favorites_25 handling.
     */
    long countByUserIdAndFavTrue(Long userId);

    /**
     * A user's favourited quotes — what a friend sees when that user's
     * quotes_visibility is 'favorites' (TASK-129).
     */
    List<Quote> findByUserIdAndFavTrue(Long userId);

    @Query("SELECT COUNT(DISTINCT q.author) FROM Quote q " +
            "WHERE q.userId = :userId AND q.manuallyAdded = true AND q.author IS NOT NULL AND q.author <> ''")
    long countDistinctManuallyAddedAuthors(@Param("userId") Long userId);

    /**
     * Number of distinct calendar days (Europe/Moscow, matching UserActivityDay's zone) on which
     * the user added any quote — the condition behind the "quote_days_10" achievement (TASK-137).
     * Counts imported quotes too (they carry an `added` timestamp), so JSON imports move it.
     * `added` is epoch millis; to_timestamp wants seconds, hence /1000.
     */
    @Query(value = "SELECT COUNT(DISTINCT (to_timestamp(added / 1000) AT TIME ZONE 'Europe/Moscow')::date) " +
            "FROM quotes WHERE user_id = :userId AND added IS NOT NULL",
            nativeQuery = true)
    long countDistinctQuoteDays(@Param("userId") Long userId);

    boolean existsBySharedQuoteIdAndUserId(Long sharedQuoteId, Long userId);

    Optional<Quote> findBySharedQuoteIdAndUserId(Long sharedQuoteId, Long userId);

    /**
     * The user's own copy of a friend's quote, if they've already saved it —
     * used to keep saving idempotent (TASK-129).
     */
    Optional<Quote> findByImportedFromQuoteIdAndUserId(Long importedFromQuoteId, Long userId);

    /**
     * Of the given source-quote ids, which the user has already saved — one
     * query to mark "saved" across a friend's whole quote list.
     */
    @Query("SELECT q.importedFromQuoteId FROM Quote q " +
            "WHERE q.userId = :userId AND q.importedFromQuoteId IN :sourceIds")
    List<Long> findSavedSourceIds(@Param("userId") Long userId, @Param("sourceIds") List<Long> sourceIds);

    /**
     * One row per user (with >= 1 quote) for the nightly community snapshot
     * (CommunityStatsService): {@code [userId, total, recent, favs]} where
     * {@code recent} counts quotes added at or after {@code cutoff} and
     * {@code favs} counts favourited quotes. Aggregates only — the userId is
     * used to bound the loop, never stored in the snapshot.
     */
    @Query("SELECT q.userId, COUNT(q), " +
            "SUM(CASE WHEN q.added >= :cutoff THEN 1 ELSE 0 END), " +
            "SUM(CASE WHEN q.fav = true THEN 1 ELSE 0 END) " +
            "FROM Quote q WHERE q.userId IS NOT NULL GROUP BY q.userId")
    List<Object[]> aggregatePerUserStats(@Param("cutoff") long cutoff);
}
