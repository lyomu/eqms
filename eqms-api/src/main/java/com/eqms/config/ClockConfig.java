package com.eqms.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Single source of time for the whole application.
 *
 * <p>CLAUDE.md compliance rule 3: ALL audit and signature timestamps come from the
 * server in UTC; client-supplied timestamps are never trusted. Every component that
 * needs "now" injects this {@link Clock} rather than calling {@code Instant.now()}
 * directly — which also makes time deterministic in tests.</p>
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock utcClock() {
        return Clock.systemUTC();
    }
}
