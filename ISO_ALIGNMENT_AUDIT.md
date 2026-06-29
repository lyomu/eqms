# ISO Alignment Audit and Implementation Plan

Date: 2026-06-29

## Purpose

This document records the initial ISO-alignment audit for the eQMS repository. It inventories the current module set, identifies gaps against accepted quality management expectations, and proposes the implementation order for hardening the system.

This is not a certification statement. The software can support an ISO-aligned quality management system, but certification depends on the organization's implemented processes, validation evidence, training, SOPs, records, audits, and external certification assessment.

## Standards Basis

The review is guided by the intent of:

- ISO 9001:2015 for quality management system structure, process control, documented information, performance evaluation, nonconformity, corrective action, and management review.
- ISO 31000:2018 for risk-based thinking and risk lifecycle controls.
- ISO 19011 for audit program planning, audit execution, findings, competence, and follow-up.
- ISO 13485:2016 where medical-device style product realization, traceability, supplier controls, and controlled records apply.
- ISO 17025 where laboratory, QC testing, OOS/OOT, equipment, calibration, and test evidence apply.

No copyrighted ISO clause text is copied into this document.

## Review Method

The audit reviewed repository structure, frontend routes, backend modules, controllers, services, workflow classes, permission annotations, and Liquibase changelogs. The current repository includes backend packages for identity, tenants, audit, signatures, workflows, documents, training, CAPA, deviations, nonconformance, change control, risk, audits, suppliers, equipment, materials, OOS, complaints, batch records, management review, dashboard, reports, products, organization settings, attachments, comments, notifications, and search.

The frontend includes corresponding application routes for the major quality modules under `frontend/apps/web/src/app/(app)`.

The database changelog set currently covers foundational identity/audit/signature controls through organization settings, module enrichments, and product lifecycle depth.

## Current Control Backbone

Already present:

- Append-only audit and electronic signature concepts.
- Shared workflow engine for many regulated records.
- Server-side permissions and role/authority checks.
- Organization scoping and tenancy controls.
- Liquibase-based schema control.
- Optimistic locking and regulated entity patterns.
- Attachments, comments, notifications, dashboards, and reporting primitives.
- Organization settings for quality scope, approval matrix, security, numbering, notifications, module controls, and change-request governance.
- Product Management enrichment with lifecycle depth, evidence, traceability, summary, related records, and rich-text narrative fields.

Needs hardening:

- Common ISO readiness model exposed consistently across modules.
- Evidence completeness gates before approval and closure in every regulated workflow.
- Cross-module CAPA, deviation, NCR, complaint, OOS, audit finding, risk, product, material, supplier, equipment, and batch traceability.
- Record retention and disposition controls.
- Consistent frontend status, overdue, evidence, approval, audit, and signature panels.
- Full module-level test coverage for ISO-critical paths.

## Module Inventory

| Module | Frontend route | Backend package | Database coverage | ISO relevance | Current maturity |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `dashboard` shell pages | `dashboard` | Aggregates existing tables | Monitoring, performance evaluation | Medium |
| Organization Settings | `settings`, `admin` | `admin/settings` | v025, v040, v041 | QMS scope, responsibilities, approval rules | High |
| Users, Roles, Permissions | `admin`, user APIs | `identity`, `auth`, `admin` | v001, v004, v023, v024, v999 | Competence, access control, segregation of duties | Medium |
| Document Control | `documents` | `documents` | v005, v022, v030, v034 | Documented information control | High |
| Records Management | Cross-module | `audit`, `attachments`, `comments`, regulated entities | v002, v003, v033 | Record integrity, evidence, retention | Medium |
| Training | `training`, `my-trainings` | `training` | v017, v029, v032 | Competence and awareness | Medium |
| CAPA | `capa` | `capa` | v007, v027, v028 | Corrective action and effectiveness | High |
| Deviations | `deviations` | `deviations` | v008, v035 | Process nonconformity and investigation | Medium |
| Nonconformance/NCR | `non-conformances` | `nonconformance` | v020 | Nonconforming outputs and disposition | Medium |
| Change Control | `change-control` | `changecontrol` | v006, v036 | Change planning, impact, implementation | High |
| Risk Management | `risks` | `risks` | v015 | Risk-based thinking | Medium |
| Audits | `audits` | `audits` | v014, v037 | Audit program, findings, follow-up | Medium |
| Suppliers | `suppliers` | `suppliers` | v016 | External provider controls | Medium |
| Equipment | `equipment` | `equipment` | v018 | Infrastructure, calibration, maintenance | Medium |
| Materials | `materials` | `materials` | v010, v038 | Input control, lot traceability, release | Medium |
| OOS/OOT | `oos` | `oosmanagement` | v019, v039 | Lab/QC investigation and disposition | High |
| Complaints | `complaints` | `complaints` | v013 | Customer feedback and investigation | Medium |
| Batch Records | `batch-records` | `batchrecords` | v011 | Production and release records | Medium |
| Products | `products` | `products` | v009, v042 | Product master data, traceability, lifecycle | High |
| Processes | Partial through docs/change/risk | Cross-module | No dedicated process module found | Process ownership and performance | Low |
| Quality Events | Distributed | CAPA, deviations, NCR, OOS, complaints, audits | Multiple | Event intake and triage | Medium |
| Management Review | `management-reviews` | `managementreview` | v021 | Management review inputs/actions | Medium |
| Notifications | `notifications` | `notifications` | v012 | Timely action and escalation | Medium |
| Reports | `reports` | `reports` | Derived | Performance evaluation and evidence | Medium |
| Audit Trail | Detail panels/APIs | `audit` | v002 | Data integrity and traceability | High |
| E-signatures | Transition flows/APIs | `signatures` | v002 | Approval accountability | High |

## System-Wide Gap Matrix

| Control area | Current state | Gap | Risk | Recommended correction |
| --- | --- | --- | --- | --- |
| QMS process model | Modules exist, but no first-class process map module found | Process ownership, inputs, outputs, KPIs, risks, and linked documents are not uniformly modeled | High | Add a Process Management module or extend settings with controlled process register |
| Approval evidence gates | Strong in some modules, uneven across others | Some workflows may permit approval or closure without complete evidence | High | Add shared readiness checks and module-specific preconditions before approval/closure |
| Traceability | Product has recent depth; several modules link partially | Cross-module relationship model is uneven | High | Standardize related-record links and surface them in every regulated record |
| CAPA triggers | CAPA module exists and some modules link to CAPA | Trigger rules are not consistently visible or enforced | High | Add module-specific CAPA trigger controls and dashboard reporting |
| Record retention | Regulated entity and soft-delete patterns exist | Retention schedules, legal hold, archival, and disposition are not consistently implemented | High | Add retention policy configuration and enforcement model |
| Data integrity | Audit/signatures/versioning exist | Need stronger evidence of immutable critical fields after approval and reason-for-change coverage | High | Add shared lock rules, reason-for-change enforcement, and regression tests |
| Permissions | Backend authorities exist | Permission matrix needs full review for all modules and UI affordances | Medium | Create permission matrix documentation and align frontend action visibility |
| Tenant isolation | Organization scoping exists | Need regression tests for every module list/detail/update path | High | Add tenant-isolation tests across regulated modules |
| Rich text | Product fields recently addressed | Need full audit of all narrative text fields | Medium | Inventory text fields and standardize rich-text editor/rendering where applicable |
| Dashboards | My work and approvals exist | ISO readiness, overdue, and effectiveness metrics are incomplete | Medium | Add compliance dashboard cards and module health summaries |
| Audit readiness | Reports module exists | Exportable validation/audit evidence packages are incomplete | Medium | Add audit pack exports for record history, signatures, attachments, and linked records |
| UI consistency | Major routes exist | Lifecycle, evidence, links, approvals, audit trail panels vary by module | Medium | Create shared regulated-record layout components |

## Module Gap Matrix

| Module | Strong points | Main gaps | Priority |
| --- | --- | --- | --- |
| Organization Settings | Rich quality-system controls, change requests, numbering, approval matrix | Need downstream enforcement audit proving each configured rule is used by affected modules | P1 |
| Documents | Lifecycle, folders, versions, approval/obsolete controls | Need full training impact, periodic review, external document controls, and retention links verified | P1 |
| Training | Assignments and training metadata exist | Need stronger competence matrix, retraining triggers from document/product/process changes, overdue escalation | P1 |
| CAPA | Mature workflow and effectiveness checks | Need standardized links from every source module and effectiveness KPI reporting | P1 |
| Deviations | Extended schema and workflow exist | Need consistent containment, impact assessment, risk linkage, and CAPA trigger enforcement | P1 |
| NCR | Dedicated module exists | Need disposition approvals, product/material/batch links, and segregation/containment evidence | P1 |
| Change Control | Mature workflow and impact/effectiveness controls | Need stronger affected-object implementation tasks across products, materials, docs, equipment, training | P1 |
| Risks | Dedicated module exists | Need shared risk taxonomy, review cadence, residual risk approvals, and links from all modules | P1 |
| Audits | Audit program and enrichment exist | Need auditor competence, audit criteria/scope evidence, finding severity, and follow-up verification | P2 |
| Suppliers | Supplier controls exist | Need qualification lifecycle, scorecards, approved supplier list controls, material/product links | P2 |
| Equipment | Equipment controls exist | Need calibration due/overdue locks, return-to-service approvals, and OOS impact links | P2 |
| Materials | Recent enrichment exists | Need release/quarantine gates, supplier qualification links, lot traceability, CoA/evidence review | P1 |
| OOS/OOT | Strong investigation and QA workflow | Need explicit OOT handling if separate from OOS, method/equipment/sample traceability, lab invalidation evidence | P1 |
| Complaints | Dedicated complaint module exists | Need product/batch links, reportability screening, trend monitoring, CAPA trigger rules | P2 |
| Batch Records | Batch records exist | Need step-level evidence, deviations/OOS/NCR links, release checklist, locked post-release state | P1 |
| Products | Recently enriched lifecycle and traceability | Need regression hardening and real selectors for linked documents/materials/risks/events | P1 |
| Processes | No dedicated route found | Need controlled process register with owners, KPIs, risks, documents, records, and review cadence | P1 |
| Management Review | Dedicated module exists | Need automatic agenda inputs from KPIs, audit results, CAPA, complaints, suppliers, risk, changes | P2 |
| Notifications | Notification module exists | Need escalation rules and configurable overdue reminders per module | P2 |
| Reports | Reporting module exists | Need ISO audit-readiness exports and management KPI packs | P2 |
| Audit Trail | Strong core service | Need visible record-level history consistency across every detail page | P1 |
| E-signatures | Core service and transition signatures exist | Need UI consistency, meaning statements, MFA/session rules, and signature manifest export | P1 |

## Highest-Risk Corrections First

1. Enforce evidence completeness before approval/closure for documents, CAPA, deviations, NCR, change control, risks, materials, OOS, batch records, and products.
2. Standardize cross-module traceability so every regulated record can link to product, material, batch, supplier, equipment, document, risk, CAPA, deviation, NCR, complaint, OOS, audit finding, and change control where applicable.
3. Add a controlled Process Management module or equivalent process register under Settings/Quality System.
4. Add retention policy configuration and record lifecycle protections for archive/disposition/legal hold.
5. Add tenant isolation, permission, and post-approval immutability tests across all regulated modules.
6. Add common frontend panels for lifecycle, evidence, linked records, audit trail, signatures, risks, CAPA links, dates, and overdue state.

## Implementation Plan

### Phase 1: ISO Control Baseline

- Add shared backend readiness/checklist model for regulated records.
- Add shared frontend regulated-record panel components.
- Add evidence-required gates to high-risk transitions.
- Add standard related-record link DTOs and APIs where missing.
- Add record-level audit/signature panels consistently on detail pages.
- Add tests for permission checks, tenant isolation, approval gates, and post-approval edit protections.

### Phase 2: Process and Traceability Completion

- Add Process Management or controlled process register under Settings.
- Link processes to owners, documents, risks, KPIs, training, changes, records, and management review.
- Expand product/material/batch traceability with real selectors and reciprocal links.
- Connect complaint, OOS, deviation, NCR, audit finding, and CAPA trigger logic.
- Add dashboards for open high-risk items, overdue items, unreviewed risks, pending approvals, and CAPA effectiveness.

### Phase 3: Retention, Review, and Audit Packs

- Add configurable retention schedules by record type.
- Add archive, legal hold, and disposition workflows where required.
- Add management review input automation.
- Add audit-readiness export packs containing record metadata, versions, attachments, linked records, signatures, and audit trail.
- Add report filters by module, owner, status, risk level, product, supplier, and date range.

### Phase 4: Validation and Deployment Readiness

- Add validation plan, requirements traceability matrix, test protocol templates, and release checklist.
- Add production deployment hardening and backup/restore runbooks.
- Add periodic access review reports.
- Add full regression CI workflow for backend, frontend, and E2E tests.

## Files and Areas Expected to Change

Likely backend areas:

- `eqms-api/src/main/java/com/eqms/common`
- `eqms-api/src/main/java/com/eqms/workflows`
- `eqms-api/src/main/java/com/eqms/audit`
- `eqms-api/src/main/java/com/eqms/signatures`
- Regulated module packages under `eqms-api/src/main/java/com/eqms`
- `eqms-api/src/main/resources/db/changelog`
- `eqms-api/src/test`

Likely frontend areas:

- `frontend/apps/web/src/app/(app)`
- `frontend/apps/web/src/components`
- `frontend/apps/web/src/hooks`
- `frontend/apps/web/src/types`
- `frontend/apps/web/src/lib`
- `frontend/apps/web/src/test` or colocated component tests

Project documentation:

- `PROJECT_OVERVIEW.md`
- `ISO_ALIGNMENT_AUDIT.md`
- Future validation, deployment, retention, and permission-matrix documents.

## Assumptions

- The initial target industry posture is pharmaceutical or adjacent GxP quality management.
- ISO 13485 and ISO 17025 controls are applied where relevant without making the whole product specific to one regulated sector.
- Organization Settings remains the home for global quality-system configuration.
- Module-specific operational controls remain in their respective modules.
- Rich text is expected for narrative regulated fields, not for short identifiers, codes, dates, numeric values, statuses, or controlled selections.

## Product Owner Confirmations Needed

- Confirm whether a dedicated Process Management module should be created, or whether the controlled process register should live under Settings.
- Confirm whether OOT should be a separate workflow or a record type inside OOS Management.
- Confirm retention schedule requirements by record type and jurisdiction.
- Confirm whether ISO 13485-style medical-device controls are core product scope or optional configuration.
- Confirm whether ISO 17025-style lab controls are core product scope or limited to QC/OOS/equipment areas.
- Confirm preferred approval matrix behavior for dual review, QA final approval, and segregation of duties.

## Next Recommended Implementation Batch

Start with Phase 1 on the highest-risk modules:

- Shared regulated-record readiness/evidence model.
- Cross-module related-record links.
- Evidence gates before approval and closure.
- Record-level UI panels for evidence, links, audit trail, signatures, dates, and overdue state.
- Permission and tenant-isolation tests for the updated flows.

This gives every later ISO improvement a consistent technical foundation instead of solving the same control separately in each module.

## Implementation Progress

| Date | Area | Implemented | Verification | Remaining work |
| --- | --- | --- | --- | --- |
| 2026-06-29 | Final ISO regression completion | Completed the remaining focused ISO regression run for Audit Management, CAPA, Change Control, and OOS. Hardened reminder-job integration testing by replacing hard-coded user ids with real test recipients, adding source-specific notification existence checks, and waiting briefly for async notification dispatch. | Focused affected backend suite passed. `mvn.cmd -pl eqms-api -Dtest=ReminderJobIntegrationTest test` passed. Full backend integration sweep `mvn.cmd -pl eqms-api -Dtest=*IntegrationTest test` passed. Earlier frontend Vitest passed: 8 files, 65 tests. | No known in-scope implementation blocker remains. Continue with formal validation evidence, SOP alignment, production deployment controls, and user acceptance testing before regulated use. |
| 2026-06-29 | ISO regression hardening | Added a test-profile opt-out for HTTP license interception so legacy module integration tests can focus on workflow behavior while `LicenseServiceIntegrationTest` still covers licensing rules. Updated workflow ISO enforcement to skip synthetic non-registered record types used by the workflow-engine test. Expanded ISO readiness evidence mapping to real child tables for CAPA, change control, risks, OOS, NCR, audits, management review, and complaints. Updated affected regulated workflow tests to seed owner/evidence/independence/impact-assessment prerequisites. | Full frontend Vitest passed: 8 files, 65 tests. Backend focused checks passed for Product, Deviation, Workflow Engine, Material, Risk, Complaint, Management Review, and Non-Conformance during this pass. Final verification for the latest Audit/CAPA/Change Control/OOS fixture edits was blocked by the environment usage limit before Maven could start. | Rerun `mvn.cmd -pl eqms-api "-Dtest=AuditManagementIntegrationTest,ChangeControlIntegrationTest,CapaIntegrationTest,OosIntegrationTest" test`, then rerun `mvn.cmd -pl eqms-api -Dtest=*IntegrationTest test` when usage resets. |
| 2026-06-29 | Docker-backed integration verification | Started Docker Desktop, brought up local Postgres/Redis/MinIO with Docker Compose, reran Product Management integration tests, and fixed owner preservation during product updates after the test exposed an ISO readiness blocker. | `mvn.cmd -pl eqms-api -Dtest=ProductIntegrationTest test` passed with 6 tests, 0 failures, 0 errors. | Run broader module integration tests as each module receives deeper workflow-specific ISO enforcement tests. |
| 2026-06-29 | ISO enforcement, retention, and screen visibility | Added central ISO readiness enforcement in `WorkflowService` for approval, signature, close, release, finalization, and terminal-status transitions. Added retention policy and legal-hold tables/APIs, default retention policies for regulated record types, readiness checks for retention policy coverage and active legal holds, and a route-aware ISO readiness banner for regulated detail pages. | Backend compile passed. Frontend typecheck passed. Product frontend tests passed. | Database-backed integration tests still require local PostgreSQL/Docker availability. Organization-specific retention policies should be reviewed and replaced with approved site policies before production validation. |
| 2026-06-29 | Cross-module ISO readiness and process register | Added a central `/api/iso-readiness/{recordType}/{recordId}` readiness API with a registry covering documents, CAPA, deviations, NCR, change control, risks, materials, OOS, batch records, audits, suppliers, equipment, management review, complaints, products, training, and QMS processes. Added a reusable frontend ISO Readiness panel to the record dossier. Added a controlled QMS Process Register under Settings with backend schema/API and frontend rich-text process controls. | Backend compile passed. Frontend typecheck passed. Product frontend tests passed. PostgreSQL check failed because `localhost:5432` is not accepting connections and Docker is not reachable. | Some module detail pages do not yet embed `RecordDossierPanel`, so the readiness API covers them but the readiness panel is not visible on every detail screen yet. Full database-backed regression still depends on PostgreSQL being available locally. |
| 2026-06-29 | Product Management ISO readiness | Added shared ISO readiness response DTOs, a Product Management readiness evaluator, `/api/products/{id}/iso-readiness`, approval blocking based on the same readiness result, frontend readiness query/types, and an ISO Readiness panel on the product detail Overview tab. | Backend compile passed. Frontend typecheck passed. Product frontend tests passed. Product integration test compilation passed, but runtime test execution could not complete because PostgreSQL on `localhost:5432` was not accepting connections. | Roll the readiness model into documents, training, CAPA, deviations, NCR, change control, risks, materials, OOS, batch records, and management review. Add full integration verification once local database services are running. |
