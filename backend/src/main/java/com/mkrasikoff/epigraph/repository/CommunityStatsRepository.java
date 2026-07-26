package com.mkrasikoff.epigraph.repository;

import com.mkrasikoff.epigraph.model.CommunityStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommunityStatsRepository extends JpaRepository<CommunityStats, Long> {
}
