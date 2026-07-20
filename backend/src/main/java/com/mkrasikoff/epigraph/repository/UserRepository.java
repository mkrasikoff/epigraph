package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByEmail(String email);

    /**
     * Case-insensitive substring search over display names, excluding the
     * searcher themselves (TASK-129). Capped at 20 rows — usernames are not
     * unique, so a short query can match many users; the client disambiguates
     * by avatar/badge. A plain btree index can't serve a leading-wildcard LIKE,
     * so if this ever gets slow the fix is a pg_trgm GIN index, not a different
     * query shape.
     */
    List<User> findTop20ByUsernameContainingIgnoreCaseAndIdNot(String username, Long id);
}
