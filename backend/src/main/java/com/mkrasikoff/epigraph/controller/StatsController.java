package com.mkrasikoff.epigraph.controller;

import com.mkrasikoff.epigraph.dto.stats.CommunityStatsResponse;
import com.mkrasikoff.epigraph.service.CommunityStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only community aggregates for the statistics screen (TASK-136). The rest
 * of the stats screen is computed client-side from the user's own quotes; the
 * only thing the client can't derive locally is how it compares to everyone else,
 * so this endpoint serves the nightly {@link CommunityStatsService} snapshot.
 * The response is the same anonymous aggregate for every user — no per-user data.
 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final CommunityStatsService communityStatsService;

    public StatsController(CommunityStatsService communityStatsService) {
        this.communityStatsService = communityStatsService;
    }

    @GetMapping("/community")
    public CommunityStatsResponse community() {
        return communityStatsService.getSnapshot();
    }
}
