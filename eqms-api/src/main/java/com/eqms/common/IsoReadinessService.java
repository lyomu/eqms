package com.eqms.common;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.eqms.common.dto.IsoReadinessItemResponse;
import com.eqms.common.dto.IsoReadinessResponse;

@Service
public class IsoReadinessService {

    private static final Set<String> TERMINAL_STATUSES = Set.of(
            "ACTIVE", "APPROVED", "EFFECTIVE", "RELEASED", "CLOSED", "COMPLETED", "FINALIZED");

    private final JdbcClient jdbc;
    private final Map<String, Boolean> tableCache = new ConcurrentHashMap<>();
    private final Map<String, Boolean> columnCache = new ConcurrentHashMap<>();
    private final Map<String, RecordSpec> specs;

    public IsoReadinessService(JdbcClient jdbc) {
        this.jdbc = jdbc;
        this.specs = buildSpecs();
    }

    public boolean supports(String recordType) {
        return specs.containsKey(normalize(recordType));
    }

    @Transactional(readOnly = true)
    public IsoReadinessResponse readiness(String recordType, String recordId) {
        RecordSpec spec = specs.get(normalize(recordType));
        if (spec == null) {
            return unsupported(recordType, recordId);
        }
        if (!tableExists(spec.table())) {
            return unsupported(recordType, recordId);
        }

        Map<String, Object> row = row(spec, recordId);
        if (row.isEmpty()) {
            return new IsoReadinessResponse(spec.recordType(), recordId, false, 0,
                    List.of(new IsoReadinessItemResponse("RECORD_EXISTS", "Record exists", "FAIL",
                            "HIGH", true, 0, "The regulated record was not found or has been deleted.")),
                    List.of("The regulated record was not found or has been deleted."));
        }

        String status = string(row, firstPresent(row, spec.statusColumns()));
        String ownerColumn = firstPresent(row, spec.ownerColumns());
        String dueColumn = firstPresent(row, spec.dueDateColumns());
        long auditEntries = count("audit_logs", "record_type = :type AND record_id = :id",
                Map.of("type", spec.recordType(), "id", recordId));
        long signatures = count("electronic_signatures", "record_type = :type AND record_id = :id",
                Map.of("type", spec.recordType(), "id", recordId));
        long activeLegalHolds = countIfPresent("record_legal_holds",
                "record_type = :type AND record_id = :id AND released_at IS NULL" + deletedPredicate("record_legal_holds"),
                Map.of("type", spec.recordType(), "id", recordId));
        long retentionPolicies = countIfPresent("record_retention_policies",
                "record_type = :type AND active = true" + deletedPredicate("record_retention_policies"),
                Map.of("type", spec.recordType()));
        long attachments = countIfPresent("attachments", "record_type = :type AND record_id = :id",
                Map.of("type", spec.recordType(), "id", recordId));
        long comments = countIfPresent("record_comments", "record_type = :type AND record_id = :id",
                Map.of("type", spec.recordType(), "id", recordId));
        long linkedEvidence = linkedEvidence(spec, recordId);
        boolean controlledStatus = StringUtils.hasText(status);
        boolean terminal = controlledStatus && TERMINAL_STATUSES.contains(status.toUpperCase(Locale.ROOT));
        boolean ownerRequired = ownerColumn != null;
        boolean hasOwner = !ownerRequired || spec.ownerColumns().stream()
                .filter(row::containsKey)
                .anyMatch(column -> row.get(column) != null && StringUtils.hasText(String.valueOf(row.get(column))));
        boolean hasAudit = auditEntries > 0;
        boolean hasEvidence = attachments + comments + linkedEvidence > 0 || spec.evidenceOptional();
        boolean signedIfTerminal = !terminal || signatures > 0;
        boolean notOverdue = dueColumn == null || isNotOverdue(row.get(dueColumn), terminal);

        List<IsoReadinessItemResponse> items = new ArrayList<>();
        items.add(item("RECORD_EXISTS", "Controlled record exists", true, "HIGH", true, 1,
                "Record exists and is active."));
        items.add(item("LIFECYCLE_STATUS", "Lifecycle status is controlled", controlledStatus, "HIGH", true,
                controlledStatus ? 1 : 0, "A controlled lifecycle status is required."));
        items.add(item("OWNER_ASSIGNED", "Owner or responsible user assigned", hasOwner, "MEDIUM", ownerRequired,
                hasOwner ? 1 : 0, "Assign an owner or responsible user before routing this record."));
        items.add(item("AUDIT_TRAIL", "Audit trail exists", hasAudit, "HIGH", true, auditEntries,
                "At least one audit-trail event must exist for the record."));
        items.add(item("EVIDENCE", "Evidence or documented rationale exists", hasEvidence, "HIGH", !spec.evidenceOptional(),
                attachments + comments + linkedEvidence,
                "Attach evidence, add a regulated comment, or complete module-specific evidence before approval or closure."));
        items.add(item("SIGNATURES", "Terminal state has electronic signature evidence", signedIfTerminal, "HIGH", terminal,
                signatures, "Approved, released, finalized, or closed records require electronic signature evidence."));
        items.add(item("DUE_DATE", "Due/review date is not overdue", notOverdue, "MEDIUM", dueColumn != null,
                dueColumn == null || row.get(dueColumn) == null ? 0 : 1,
                "The record has an overdue due date, target date, review date, or completion date."));
        items.add(item("RETENTION_POLICY", "Retention policy configured", retentionPolicies > 0,
                "MEDIUM", true, retentionPolicies,
                "A retention policy must be configured for this record type."));
        items.add(item("LEGAL_HOLD", "No active legal hold", activeLegalHolds == 0,
                "HIGH", true, activeLegalHolds,
                "Active legal holds must be released before final disposition or closure."));

        spec.requiredColumns().forEach((code, label) -> {
            String column = firstPresent(row, List.of(code));
            if (column != null) {
                boolean present = row.get(column) != null && StringUtils.hasText(String.valueOf(row.get(column)));
                items.add(item("FIELD_" + code.toUpperCase(Locale.ROOT), label, present, "MEDIUM", true,
                        present ? 1 : 0, label + " is required for ISO readiness."));
            }
        });

        List<String> blockers = items.stream()
                .filter(IsoReadinessItemResponse::blocking)
                .map(IsoReadinessItemResponse::message)
                .toList();
        long passed = items.stream().filter(i -> "PASS".equals(i.status())).count();
        int score = items.isEmpty() ? 100 : (int) Math.round((passed * 100.0) / items.size());
        return new IsoReadinessResponse(spec.recordType(), recordId, blockers.isEmpty(), score, items, blockers);
    }

    private IsoReadinessResponse unsupported(String recordType, String recordId) {
        IsoReadinessItemResponse item = new IsoReadinessItemResponse("SUPPORTED_RECORD_TYPE",
                "Supported regulated record type", "FAIL", "HIGH", true, 0,
                "No ISO readiness registry entry exists for record type " + recordType + ".");
        return new IsoReadinessResponse(recordType, recordId, false, 0, List.of(item), List.of(item.message()));
    }

    private IsoReadinessItemResponse item(String code, String label, boolean passed, String severity,
                                          boolean required, long evidenceCount, String failMessage) {
        return new IsoReadinessItemResponse(code, label, passed ? "PASS" : "FAIL", severity, required,
                evidenceCount, passed ? "Ready." : failMessage);
    }

    private Map<String, Object> row(RecordSpec spec, String recordId) {
        String deletedPredicate = columnExists(spec.table(), "deleted_at") ? " AND deleted_at IS NULL" : "";
        List<Map<String, Object>> rows = jdbc.sql("SELECT * FROM " + spec.table() + " WHERE id = :id" + deletedPredicate)
                .param("id", Long.valueOf(recordId))
                .query((rs, n) -> {
                    Map<String, Object> values = new LinkedHashMap<>();
                    for (int i = 1; i <= rs.getMetaData().getColumnCount(); i++) {
                        values.put(rs.getMetaData().getColumnName(i).toLowerCase(Locale.ROOT), rs.getObject(i));
                    }
                    return values;
                })
                .list();
        return rows.isEmpty() ? Map.of() : rows.get(0);
    }

    private long linkedEvidence(RecordSpec spec, String recordId) {
        long total = 0;
        for (EvidenceSpec evidence : spec.evidenceTables()) {
            if (tableExists(evidence.table())) {
                String fk = firstExistingColumn(evidence.table(), evidence.foreignKeyColumns());
                if (fk != null) {
                    total += count(evidence.table(), fk + " = :id" + deletedPredicate(evidence.table()),
                            Map.of("id", Long.valueOf(recordId)));
                }
            }
        }
        return total;
    }

    private long countIfPresent(String table, String predicate, Map<String, ?> params) {
        return tableExists(table) ? count(table, predicate, params) : 0;
    }

    private long count(String table, String predicate, Map<String, ?> params) {
        var spec = jdbc.sql("SELECT count(*) FROM " + table + " WHERE " + predicate);
        for (Map.Entry<String, ?> entry : params.entrySet()) {
            spec = spec.param(entry.getKey(), entry.getValue());
        }
        return spec.query(Long.class).single();
    }

    private String deletedPredicate(String table) {
        return columnExists(table, "deleted_at") ? " AND deleted_at IS NULL" : "";
    }

    private boolean tableExists(String table) {
        return tableCache.computeIfAbsent(table, t -> jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = :table
                )
                """).param("table", t).query(Boolean.class).single());
    }

    private boolean columnExists(String table, String column) {
        return columnCache.computeIfAbsent(table + "." + column, key -> jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema() AND table_name = :table AND column_name = :column
                )
                """).param("table", table).param("column", column).query(Boolean.class).single());
    }

    private String firstExistingColumn(String table, List<String> columns) {
        return columns.stream().filter(column -> columnExists(table, column)).findFirst().orElse(null);
    }

    private String firstPresent(Map<String, Object> row, List<String> columns) {
        return columns.stream().filter(row::containsKey).findFirst().orElse(null);
    }

    private boolean isNotOverdue(Object value, boolean terminal) {
        if (value == null || terminal) return true;
        if (value instanceof java.sql.Date date) return !date.toLocalDate().isBefore(LocalDate.now());
        if (value instanceof LocalDate date) return !date.isBefore(LocalDate.now());
        return true;
    }

    private String string(Map<String, Object> row, String column) {
        if (column == null || row.get(column) == null) return null;
        return String.valueOf(row.get(column));
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace("-", "").replace("_", "").toLowerCase(Locale.ROOT);
    }

    private Map<String, RecordSpec> buildSpecs() {
        List<RecordSpec> all = List.of(
                spec("Document", "documents", List.of("document_status", "status"), List.of("owner_id", "created_by"),
                        List.of("next_review_date", "review_due_date"), false, evidence("document_versions", "document_id"), evidence("document_notes", "document_id")),
                spec("Capa", "capas", List.of("capa_status", "status"), List.of("owner_id", "assigned_to", "submitted_by", "created_by"),
                        List.of("due_date", "target_completion_date", "closed_date"), false, evidence("capa_actions", "capa_id")),
                spec("Deviation", "deviations", List.of("deviation_status", "status"), List.of("owner_id", "created_by"),
                        List.of("due_date", "target_closure_date", "closed_date"), false),
                spec("NonConformance", "non_conformances", List.of("status", "nc_status"), List.of("owner_id", "created_by"),
                        List.of("due_date", "closed_date"), false, evidence("non_conformance_investigation", "nc_id", "non_conformance_id"),
                        evidence("non_conformance_disposition", "nc_id", "non_conformance_id"),
                        evidence("non_conformance_use_as_is_approval", "nc_id", "non_conformance_id"),
                        evidence("non_conformance_capa_link", "nc_id", "non_conformance_id")),
                spec("ChangeControl", "change_controls", List.of("change_status", "status"), List.of("owner_id", "created_by"),
                        List.of("target_completion_date", "closed_date"), false, evidence("change_control_departments", "change_control_id"),
                        evidence("change_control_impact_tasks", "change_control_id")),
                spec("Risk", "risks", List.of("risk_status", "status"), List.of("owner_id", "risk_owner_id", "created_by"),
                        List.of("review_date", "next_review_date", "closed_date"), false, evidence("risk_analysis", "risk_id"),
                        evidence("risk_mitigation", "risk_id"), evidence("risk_control_effectiveness", "risk_id")),
                spec("Material", "materials", List.of("material_status", "status"), List.of("owner_id", "created_by"),
                        List.of("next_review_date", "review_date"), false, evidence("material_supplier_links", "material_id"), evidence("material_lots", "material_id")),
                spec("OosCase", "oos_cases", List.of("status", "oos_status"), List.of("owner_id", "reported_by_id", "reported_by_name", "submitted_by", "created_by", "assigned_to"),
                        List.of("due_date", "closed_date"), false, evidence("oos_initial_assessment", "oos_id", "oos_case_id"),
                        evidence("oos_repeat_testing", "oos_id", "oos_case_id"), evidence("oos_investigation", "oos_id", "oos_case_id"),
                        evidence("oos_disposition", "oos_id", "oos_case_id"), evidence("oos_containment", "oos_id", "oos_case_id"),
                        evidence("oos_investigation_items", "oos_id", "oos_case_id"), evidence("oos_retest_resample", "oos_id", "oos_case_id"),
                        evidence("oos_impact_assessment", "oos_id", "oos_case_id"), evidence("oos_root_cause", "oos_id", "oos_case_id"),
                        evidence("oos_linked_records", "oos_id", "oos_case_id"), evidence("oos_evidence", "oos_id", "oos_case_id")),
                spec("BatchRecord", "batch_records", List.of("batch_status", "status"), List.of("owner_id", "created_by"),
                        List.of("manufacturing_date", "released_at"), false, evidence("batch_steps", "batch_record_id"), evidence("batch_qc_results", "batch_record_id")),
                spec("Audit", "audits", List.of("audit_status", "status"), List.of("owner_id", "lead_auditor_id", "created_by"),
                        List.of("planned_date", "audit_date", "due_date"), false, evidence("audit_findings", "audit_id"),
                        evidence("audit_follow_up", "current_audit_id", "audit_id")),
                spec("Supplier", "suppliers", List.of("supplier_status", "status"), List.of("owner_id", "created_by"),
                        List.of("next_review_date", "qualification_due_date"), false, evidence("supplier_qualifications", "supplier_id")),
                spec("Equipment", "equipment", List.of("equipment_status", "status"), List.of("owner_id", "created_by"),
                        List.of("next_calibration_date", "next_maintenance_date"), false, evidence("equipment_maintenance_records", "equipment_id"), evidence("equipment_calibrations", "equipment_id")),
                spec("ManagementReview", "management_reviews", List.of("status", "review_status"), List.of("owner_id", "created_by"),
                        List.of("review_date"), false, evidence("review_metrics", "management_review_id"),
                        evidence("review_audit_results", "management_review_id"), evidence("review_product_feedback", "management_review_id"),
                        evidence("review_action_items", "review_id", "management_review_id"), evidence("review_decisions", "review_id", "management_review_id")),
                spec("Complaint", "complaints", List.of("complaint_status", "status"), List.of("owner_id", "created_by"),
                        List.of("due_date", "closed_date"), false, evidence("complaint_investigation", "complaint_id"),
                        evidence("complaint_resolution", "complaint_id"), evidence("complaint_capa_link", "complaint_id"),
                        evidence("complaint_timeline", "complaint_id")),
                spec("Product", "products", List.of("status", "product_status"), List.of("owner_id", "created_by"),
                        List.of("next_review_date"), false, evidence("product_specifications", "product_id"), evidence("product_documents", "product_id"), evidence("product_risk_links", "product_id")),
                spec("TrainingProgram", "training_programs", List.of("status", "training_status"), List.of("owner_id", "created_by"),
                        List.of("due_date", "next_review_date"), false, evidence("training_assignments", "program_id", "training_program_id")),
                spec("QmsProcess", "qms_processes", List.of("status"), List.of("process_owner_id", "created_by"),
                        List.of("next_review_date"), false)
        );
        Map<String, RecordSpec> map = new LinkedHashMap<>();
        for (RecordSpec spec : all) {
            map.put(normalize(spec.recordType()), spec);
        }
        return map;
    }

    private RecordSpec spec(String recordType, String table, List<String> statusColumns, List<String> ownerColumns,
                            List<String> dueDateColumns, boolean evidenceOptional, EvidenceSpec... evidenceTables) {
        return new RecordSpec(recordType, table, statusColumns, ownerColumns, dueDateColumns,
                Map.of(), evidenceOptional, List.of(evidenceTables));
    }

    private EvidenceSpec evidence(String table, String... foreignKeyColumns) {
        return new EvidenceSpec(table, List.of(foreignKeyColumns));
    }

    private record RecordSpec(String recordType, String table, List<String> statusColumns,
                              List<String> ownerColumns, List<String> dueDateColumns,
                              Map<String, String> requiredColumns, boolean evidenceOptional,
                              List<EvidenceSpec> evidenceTables) {
    }

    private record EvidenceSpec(String table, List<String> foreignKeyColumns) {
    }
}
