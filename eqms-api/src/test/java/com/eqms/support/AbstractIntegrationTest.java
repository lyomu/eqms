package com.eqms.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * Base class for integration tests.
 *
 * <p>These tests run against the PostgreSQL brought up by {@code docker compose} on
 * {@code localhost:5432}, rather than spinning up a TestContainers database. This keeps the
 * tests free of any dependency on the Docker HTTP API from Java (which is version-sensitive
 * across Docker Desktop releases). Liquibase applies the full changelog to that database on
 * Spring context startup — creating the schema, the least-privilege {@code eqms_app} role, and
 * the grants — so tests still exercise the real production schema, triggers, constraints, and
 * privilege model.</p>
 *
 * <p><b>Prerequisite:</b> {@code docker compose up -d} must be running before these tests.</p>
 *
 * <p>Tests are written to be re-runnable against this persistent database: each uses unique
 * record identifiers / sequence keys per run so repeated executions never collide.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "eqms.security.csrf.enabled=false")
@Import(TestStorageConfig.class)
public abstract class AbstractIntegrationTest {

    /** JDBC URL of the docker-compose PostgreSQL. */
    protected static final String JDBC_URL = "jdbc:postgresql://localhost:5432/eqms";

    /** DDL owner — runs Liquibase, used by the Spring datasource in tests. */
    protected static final String OWNER_USER = "eqms_owner";
    protected static final String OWNER_PASSWORD = "owner_dev_pw";

    /** Least-privilege runtime role — used by privilege-enforcement assertions. */
    protected static final String APP_ROLE_USER = "eqms_app";
    protected static final String APP_ROLE_PASSWORD = "app_dev_pw";

    protected static String jdbcUrl() {
        return JDBC_URL;
    }
}
