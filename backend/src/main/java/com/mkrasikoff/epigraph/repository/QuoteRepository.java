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

    long countByUserIdAndManuallyAddedTrueAndFavTrue(Long userId);

    @Query("SELECT COUNT(DISTINCT q.author) FROM Quote q " +
            "WHERE q.userId = :userId AND q.manuallyAdded = true AND q.author IS NOT NULL AND q.author <> ''")
    long countDistinctManuallyAddedAuthors(@Param("userId") Long userId);
}
