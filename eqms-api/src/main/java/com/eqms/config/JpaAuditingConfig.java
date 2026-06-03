package com.eqms.config;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.TemporalAccessor;
import java.util.Optional;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.domain.AuditorAware;

/**
 * Wires Spring Data JPA auditing to the server UTC {@link Clock} and to the current user.
 *
 * <ul>
 *   <li>{@code utcDateTimeProvider} feeds {@code @CreatedDate}/{@code @LastModifiedDate}
 *       from the UTC clock (compliance rule 3).</li>
 *   <li>{@code auditorAware} feeds {@code @CreatedBy}/{@code @LastModifiedBy}. In Milestone 0
 *       there is no authentication yet, so it returns empty; Milestone 1 replaces this with
 *       the authenticated principal's user id.</li>
 * </ul>
 */
@Configuration
public class JpaAuditingConfig {

    /** Provides the current instant in UTC for JPA auditing annotations. */
    @Bean
    public DateTimeProvider utcDateTimeProvider(Clock utcClock) {
        return () -> Optional.<TemporalAccessor>of(Instant.now(utcClock));
    }

    /**
     * Resolves the acting user id for {@code @CreatedBy}/{@code @LastModifiedBy}.
     * Placeholder until Spring Security is introduced in Milestone 1.
     */
    @Bean
    public AuditorAware<Long> auditorAware() {
        return Optional::empty;
    }
}
