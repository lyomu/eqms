# Project: Pharmaceutical eQMS Backend (UPDATED)

## What this is
A Java + Spring Boot backend for a pharmaceutical eQMS managing 16 integrated
quality modules across 5 deployment phases:

**Phase 1 MVP (Milestones 0–10):** Document Control, Training, Change Control,
Deviations, CAPA, Product Management, Material Management, Electronic Batch Records,
Audit Trail, E-Signatures, Sequences, Optimistic Locking, Notifications, Reports.

**Phase 2 (Milestones 11–15):** Complaint Management, Audits, Risk Management,
Supplier Quality, Training (expanded).

**Phase 3 (Milestones 16–19):** Equipment & Calibration, OOS Management,
Non-Conformance, Management Review.

**Phase 4:** Advanced Analytics, Custom Workflows, AI Risk Detection.

**Phase 5:** Desktop App (Tauri), On-Premise Deployment.

All modules must be defensible under FDA 21 CFR Part 11 and EU GMP Annex 11.

## Tech stack (LOCKED — do not substitute without asking)
- Language: Java 21 LTS
- Framework: Spring Boot 3.2.x
- Database: PostgreSQL 15+
- ORM: Spring Data JPA + Hibernate 6
- Auth: Spring Security + OAuth2 + Spring TOTP MFA
- File storage: S3-compatible (MinIO locally, S3 in prod)
- Background jobs: Spring Batch + Quartz Scheduler
- Password hashing: Argon2id via Spring Security PasswordEncoder
- Testing: JUnit 5 + Mockito + TestContainers
- Build tool: Maven 3.9+
- Monorepo: Maven multi-module (eqms-api, eqms-shared, eqms-cli)
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

## Milestone Sequence (20 total: M0–M19)

**Phase 1 MVP (Months 1–3):**
- M0: Foundation (Maven, PostgreSQL, Liquibase, audit trail, sequences) ✅
- M1: Auth & RBAC (Spring Security, TOTP, lockout, guards) ✅
- M2: Workflow engine + e-signatures (WorkflowService, SignatureService, Part 11) ✅
- M3: Document Control (full module) ✅
- M4: Change Control (full module) ✅
- M5: CAPA (full module) ✅
- M6: Deviations (full module) ✅
- M7: Product Management (full module) ✅
- M8: Material Management (full module) ✅
- M9: Electronic Batch Records (full module)
- M10: Notifications + Dashboard + Reports

**Phase 2 (Months 4–5):**
- M11: Complaint Management
- M12: Audit Management
- M13: Risk Management
- M14: Supplier Quality Management
- M15: Training Management (expanded)

**Phase 3 (Months 6–7):**
- M16: Equipment & Calibration Management
- M17: OOS Management
- M18: Non-Conformance Management
- M19: Management Review

**Phase 4 (Months 8–9):**
- Advanced Analytics, Custom Workflows, AI Risk Detection

**Phase 5 (Months 10–12):**
- Desktop App (Tauri wrapper)
- On-Premise Deployment

## All 16 Modules

**Core Quality:**
1. Document Control - M3
2. Training Management - M15
3. Change Management - M4
4. Deviation Management - M6

**Investigation & Corrective:**
5. CAPA Management - M5
6. Complaint Management - M11
7. OOS Management - M17

**Compliance & Oversight:**
8. Audit Management - M12
9. Risk Management - M13
10. Equipment Management - M16
11. Supplier Management - M14

**Manufacturing & Production:**
12. Material Management - M8
13. Electronic Batch Records - M9
14. Product Management - M7
15. Non-Conformance Management - M18
16. Management Review - M19

## Coding standards
- Java: OpenJDK 21, strict mode
- Spring Boot 3.2.x, no custom servlet containers
- No raw SQL (Spring Data JPA only, except performance tuning)
- Lombok for boilerplate reduction (@Data, @Getter, @Setter, @Builder)
- Every endpoint has: input validation (Spring Validation), permission guard,
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
- Do not skip audit logging for any regulated action.
