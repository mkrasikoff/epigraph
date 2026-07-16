package com.mkrasikoff.epigraph.web;

import com.mkrasikoff.epigraph.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1) // runs before JwtAuthFilter
public class MdcLoggingFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public MdcLoggingFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // short requestId — first 8 UUID symbols
            String requestId = UUID.randomUUID().toString().substring(0, 8);
            MDC.put("requestId", requestId);

            // userId from JWT if exists
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    Long userId = jwtService.extractUserId(authHeader.substring(7));
                    MDC.put("userId", String.valueOf(userId));
                } catch (Exception ignored) {
                    MDC.put("userId", "anonymous");
                }
            } else {
                MDC.put("userId", "anonymous");
            }

            // set requestId to response header - useful for debug
            response.setHeader("X-Request-Id", requestId);

            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
