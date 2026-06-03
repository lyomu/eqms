package com.eqms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Entry point for the eQMS REST API (Java 21 + Spring Boot 3.2).
 *
 * <p>{@code @EnableJpaAuditing} activates the {@code @CreatedDate}/{@code @LastModifiedDate}
 * and {@code @CreatedBy}/{@code @LastModifiedBy} population used by {@code RegulatedEntity},
 * with timestamps sourced from the UTC clock configured in {@code JpaAuditingConfig}.</p>
 */
@SpringBootApplication
@EnableJpaAuditing(dateTimeProviderRef = "utcDateTimeProvider")
public class EqmsApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(EqmsApiApplication.class, args);
    }
}
