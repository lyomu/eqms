package com.eqms.config;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.TemporalAccessor;
import java.util.Optional;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;

/**
 * Wires Spring Data JPA auditing to the server UTC {@link Clock}.
 *
 * <p>{@code utcDateTimeProvider} feeds {@code @CreatedDate}/{@code @LastModifiedDate} from the UTC
 * clock (compliance rule 3). The {@code @CreatedBy}/{@code @LastModifiedBy} auditor is provided by
 * {@code com.eqms.auth.SecurityAuditorAware} (the authenticated principal's user id).</p>
 */
@Configuration
public class JpaAuditingConfig {

    /** Provides the current instant in UTC for JPA auditing annotations. */
    @Bean
    public DateTimeProvider utcDateTimeProvider(Clock utcClock) {
        return () -> Optional.<TemporalAccessor>of(Instant.now(utcClock));
    }
}
