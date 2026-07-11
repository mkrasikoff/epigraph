package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.SharedQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SharedQuoteRepository extends JpaRepository<SharedQuote, Long> {

    Optional<SharedQuote> findByToken(String token);

    Optional<SharedQuote> findByOwnerUserIdAndSourceQuoteId(Long ownerUserId, Long sourceQuoteId);
}
