# Project: Pharmaceutical eQMS

## What this is
A web-based electronic Quality Management System (eQMS) for pharmaceutical
manufacturers. It manages 16 integrated quality modules:

**Core Modules:** Document Control, Training, Change Control, Deviations, CAPA,
Complaints, Audits, Risk, Equipment, Suppliers, Material Management, Electronic
Batch Records, Product Management, Non-Conformance, OOS Management, Management Review.

It must be defensible under FDA 21 CFR Part 11 and EU GMP Annex 11.

## Tech stack (LOCKED — do not substitute without asking)
- Frontend: Next.js (App Router) + TypeScript
- Backend: Java 21 LTS + Spring Boot 3.2 + Spring Cloud
- Database: PostgreSQL 15+
- ORM: Spring Data JPA + Hibernate 6
- Auth: Spring Security + OAuth2 + Spring TOTP MFA
- File storage: S3-compatible (MinIO locally, S3 in prod)
- Background jobs: Spring Batch + Quartz Scheduler
- Password hashing: Spring Security PasswordEncoder (Argon2id via bcrypt)
- Testing: JUnit 5 + Mockito + TestContainers
- Build tool: Maven 3.9+
- Build artifact: Docker container (OpenJDK 21 base image)
- Monorepo: Maven with modules for API, shared, CLI utilities
- Deployment: Spring Boot embedded Tomcat (no external servlet container)

## NON-NEGOTIABLE COMPLIANCE RULES
These are regulatory requirements. Never violate them, never "simplify" them away,
and flag immediately if a requested feature would conflict with them.

1. AUDIT TRAIL IS APPEND-ONLY.
   - audit_logs table accepts INSERT only. No UPDATE, no DELETE — ever.
   - The application DB user must have INSERT+SELECT only on audit_logs.
   - Every create/edit/submit/approve/reject/close/status-change writes an audit entry.
   - Each entry records: record type, record id, action, field name, old value,
     new value, reason_for_change, user id, user full name, UTC timestamp,
     IP address, user agent.
   - Implementation: Spring Data JPA event listener on Hibernate post-insert/update events.
   - Persisted in the same @Transactional block as the business change.

2. NO HARD DELETES OF REGULATED RECORDS.
   - Use soft delete (deleted_at timestamp) everywhere.
   - Revoke DELETE privilege from the application DB user on all regulated tables.
   - Spring Data JPA implementation: @SQLDelete with custom DELETE (setting deleted_at only).

3. SERVER-SIDE UTC TIMESTAMPS ONLY.
   - All audit and signature timestamps come from the server in UTC.
   - Never trust a client-supplied timestamp for any regulated action.
   - Implementation: Spring Data's @CreatedDate, @LastModifiedDate with ZonedDateTime.UTC.
   - Verify server time is NTP-synced (add to deployment checklist).

4. ELECTRONIC SIGNATURES (21 CFR Part 11).
   - Signing requires re-authentication (password; full credentials incl. MFA for
     the first signature in a session).
   - Store signature_meaning from a controlled vocabulary ONLY:
     Authored | Reviewed | Approved | Released | Rejected | Acknowledged.
   - Store an HMAC-SHA256 hash binding the signature to the record content +
     metadata, so a signature cannot be transferred to another record.
   - The signed name, UTC date/time, and meaning must be renderable on the
     human-readable record (screen + PDF), not just in the database.
   - Implementation: Spring Security custom authentication filter for re-auth.
   - Spring Security UserDetails includes session-level flag for "first signature".

5. OPTIMISTIC LOCKING.
   - Every regulated record table has an integer `version` column (@Version).
   - Every update checks submitted version against current version; reject on mismatch.
   - Hibernate handles this automatically with JPA @Version.

6. RECORD NUMBERING IS CONCURRENCY-SAFE.
   - Generate numbers (e.g. CC-2026-001) via a dedicated record_sequences table
     using SELECT ... FOR UPDATE, or a Postgres sequence per module per year.
   - NEVER compute MAX(record_no)+1 in application code.
   - Implementation: Spring Data JPA custom repository with native query using
     SELECT nextval() for PostgreSQL sequences.

7. SELF-APPROVAL IS PROHIBITED.
   - A user can never approve their own record. No configurable exception for
     GMP-critical records.
   - Implementation: Spring Security's @PreAuthorize("@approvalService.canApprove(#record, principal)")
     method-level security.

8. PERMISSION CHECKS HAPPEN ON THE BACKEND.
   - Frontend hiding is UX only. Authorization is enforced in the API layer.
   - Implementation: Spring Security configuration with role-based access control.
   - @Secured, @RolesAllowed, or custom @PreAuthorize on every REST endpoint.

9. DESKTOP APP TIMESTAMPS.
   - If a desktop application is deployed, all timestamps and signing ceremonies
     must still route through the backend API. The desktop app must never supply
     timestamps for regulated actions — it is a client, not a trusted time source.
   - Implementation: All timestamp values come from server response JSON.

## Architecture principles
- Modular backend: one Spring Boot module per domain (documents, change-control,
  deviations, capa, etc.) plus shared modules (auth, users, roles, workflows,
  signatures, audit-trail, attachments, notifications).
- All workflow state transitions go through a single WorkflowService that checks
  permission, required fields, required attachments, required signatures, and
  writes the audit entry. No module mutates status directly.
- Shared types live in a Maven module (shared-api) and are imported by backend.
- Every regulated mutation is wrapped so the audit entry and the data change
  commit in the same @Transactional block.
- Spring Data repositories use custom query methods for audit logging hooks.

## Coding standards
- Java: OpenJDK 21 or Eclipse Adoptium 21
- SpringBoot version: 3.2.x (latest 3.2 LTS)
- Compiler: Maven with source/target 21
- No raw SQL (use Spring Data JPA exclusively except for performance tuning)
- Lombok can be used for boilerplate reduction (@Data, @Getter, @Setter, @Builder)
- Every API endpoint has: input validation (Spring Validation), permission guard, 
  and at least one integration test
- Conventional commits. Small, reviewable commits.
- Write the test alongside the code, not "later".
- Use Mockito for unit tests, TestContainers for PostgreSQL integration tests.

## What NOT to do
- Do not add features beyond the current milestone. Ask first.
- Do not introduce new libraries not listed above without asking.
- Do not weaken any compliance rule for convenience.
- Do not build offline mode, e-signature-offline, or the desktop wrapper yet
  (those are a much later phase).
- Do not use JPA @ManyToMany without explicit join tables (complicates auditing).
- Do not use Spring Data JPA custom implementations unless absolutely necessary 
  (keep it simple and auditable).