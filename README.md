# Pharmaceutical eQMS

A web-based electronic Quality Management System for pharmaceutical manufacturers,
defensible under **FDA 21 CFR Part 11** and **EU GMP Annex 11**.

This repository currently contains **Milestone 0: project foundation** — the Maven
multi-module skeleton, the local infrastructure (PostgreSQL / Redis / MinIO), the
compliance-critical database schema (identity, append-only audit trail, immutable
electronic signatures, attachments, record sequences), and two fully-tested core
services: `AuditService` and `SequenceService`.

> See [CLAUDE.md](CLAUDE.md) for the locked tech stack and the non-negotiable
> compliance rules that govern every change.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| JDK | **21 LTS** | Eclipse Temurin or OpenJDK 21. Verify: `java -version` |
| Maven | **3.9+** | Verify: `mvn -version` |
| Docker | Desktop / Engine | For Postgres, Redis, MinIO. Verify: `docker --version` |

> ⚠️ On a fresh machine none of these may be installed. Install all three and ensure
> they are on your `PATH` before building.

---

## Module layout

```
eqms-parent (pom)         aggregator + Spring Boot BOM
├── eqms-shared           framework-free DTOs, enums, validation (no Spring runtime)
├── eqms-api              the Spring Boot application (entities, services, Liquibase, tests)
└── eqms-cli              Picocli command-line utilities (skeleton)
```

Dependency direction: `eqms-api → eqms-shared`, `eqms-cli → eqms-shared`.

---

## Run locally

### 1. Start infrastructure
```bash
cp .env.example .env          # adjust if you like
docker compose up -d
```
This starts:
- **PostgreSQL** on `localhost:5432` (db `eqms`, owner `eqms_owner`)
- **Redis** on `localhost:6379`
- **MinIO** on `localhost:9000` (console `:9001`)

On first start the Postgres init script creates the least-privilege runtime role
`eqms_app`. Table grants are applied by Liquibase (changeset `v999-privileges`) when
the API boots.

### 2. Run the API
```bash
mvn -pl eqms-api -am spring-boot:run -Dspring-boot.run.profiles=local
```
Liquibase applies all changelogs on startup. The app connects to Postgres as the
least-privilege `eqms_app` role under the `local` profile.

### 3. Build everything
```bash
mvn clean install
```

---

## Tests

```bash
mvn test                 # unit tests
mvn verify               # unit + TestContainers integration tests (requires Docker running)
```

Integration tests use **TestContainers** to spin up a disposable PostgreSQL, run the
real Liquibase changelogs against it, and exercise the live schema. Key tests:

| Test | What it proves |
|------|----------------|
| `AuditServiceIntegrationTest` | Audit entries persist within the caller's transaction; UTC server timestamp is applied; append-only. |
| `SequenceServiceConcurrencyTest` | 50 parallel threads requesting numbers for the same module/year produce **no duplicates** and no gaps. |
| `AuditImmutabilityIntegrationTest` | `UPDATE`/`DELETE` on `audit_logs` and `electronic_signatures` are rejected (privilege + trigger). |

---

## Compliance posture (Milestone 0)

- **Append-only audit trail** — `audit_logs` has no `UPDATE`/`DELETE` grant for the app
  role *and* a `BEFORE UPDATE/DELETE` trigger that raises an exception (defense in depth).
- **Immutable signatures** — `electronic_signatures` is mapped `@Immutable`, restricted to
  a controlled meaning vocabulary, and carries an HMAC binding (populated from Milestone 2).
- **No hard deletes** — regulated tables use soft delete (`deleted_at`); the app role has
  no `DELETE` privilege; entities use `@SQLDelete` + `@SQLRestriction`.
- **Server-side UTC** — all regulated timestamps come from a UTC `Clock` bean, never the client.
- **Optimistic locking** — every mutable regulated table has a `version` column (`@Version`).
- **Concurrency-safe numbering** — `record_sequences` + `SELECT … FOR UPDATE`, never `MAX()+1`.

---

## What's next

Milestone 1 (Auth & access control) builds on this foundation — see CLAUDE.md and the
project roadmap. Do not add module features beyond the current milestone without approval.

## Where the next developer should add things

- New regulated entity → extend `RegulatedEntity` (gets audit columns, `@Version`,
  soft delete) and add a Liquibase changeset; never write raw schema outside `db/changelog`.
- New mutation → route status changes through the (forthcoming) `WorkflowService` and
  always call `AuditService.record(...)` inside the same `@Transactional` block.
- New record number → register a row in `record_sequences` and call
  `SequenceService.next(moduleCode, year)`.
