---
name: local-build-and-test-setup
description: How to build/test the eQMS locally on this Windows machine, and the environment gotchas that were resolved in Milestone 0
metadata:
  type: project
---

Milestone 0 was verified green on 2026-06-03 (`Tests run: 9, Failures: 0`). Hard-won environment facts for this Windows 11 machine:

**Java must be 21, not 25.** The machine has both JDK 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`) and JDK 25 installed. The project/CLAUDE.md locks **Java 21 LTS**; Spring Boot 3.2 + Hibernate + the bundled Docker test libs predate Java 25 and break on it. `JAVA_HOME` is set (User env) to the JDK 21 path. If a build targets 25, revert `java.version`/`maven.compiler.release` in the root pom to 21.

**Maven** is installed manually at `C:\tools\apache-maven-3.9.16` (no winget package exists for Maven). It's on PATH.

**Integration tests run against the docker-compose PostgreSQL (`localhost:5432`), NOT TestContainers.** Reason: Docker Desktop 4.76's engine returns HTTP **400** to the older docker-java bundled with Spring Boot 3.2 (a ~2-year version gap), so TestContainers can't get a Docker client on this machine. `AbstractIntegrationTest` is a plain `@SpringBootTest @ActiveProfiles("test")`; `application-test.yml` points the datasource at `localhost:5432` as `eqms_owner`. Tests use unique IDs/sequence keys per run so they're re-runnable against the persistent DB. **Prerequisite: `docker compose up -d` must be running before `mvn verify`.** (If TestContainers is ever wanted for CI, that's a separate environment with matched Docker/library versions.)

**Liquibase XSD pinned to 4.24** in all `db/changelog/*.xml` (matches the liquibase-core 4.24.0 that Spring Boot 3.2.5 bundles). Using a newer XSD (e.g. 4.25) triggers a remote-lookup failure under `secureParsing=true`. Keep the XSD version aligned with the bundled Liquibase.

**Commands to verify the build:**
```
docker compose up -d
mvn clean install            # compile all modules
mvn -pl eqms-api -am verify  # run integration tests (needs Postgres up)
```
See also [[simplerqms-ui-reference]] for the eventual frontend.
