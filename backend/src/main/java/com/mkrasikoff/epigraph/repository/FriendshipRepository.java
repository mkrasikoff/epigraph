package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    /**
     * The single directed row for a (requester, addressee) pair, if any. Both
     * directions are checked separately by FriendshipService rather than with an
     * either-direction query, so a non-unique result can never arise.
     */
    Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

    /**
     * Rows addressed to the user in a given status — used with PENDING to list
     * incoming friend requests.
     */
    List<Friendship> findByAddresseeIdAndStatus(Long addresseeId, String status);

    /**
     * Rows the user sent, in a given status — used with PENDING to list their own
     * outstanding requests.
     */
    List<Friendship> findByRequesterIdAndStatus(Long requesterId, String status);

    /**
     * How many requests await the user's answer, for the header badge. Served by
     * idx_friendships_addressee, so this stays a cheap counted index scan even
     * though it runs on every /api/auth/me.
     */
    long countByAddresseeIdAndStatus(Long addresseeId, String status);

    /**
     * Every accepted friendship the user is part of, on either side. The caller
     * maps each row to "the other user".
     */
    @Query("SELECT f FROM Friendship f WHERE f.status = 'ACCEPTED' AND (f.requesterId = :userId OR f.addresseeId = :userId)")
    List<Friendship> findAcceptedForUser(@Param("userId") Long userId);
}
