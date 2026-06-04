package com.eqms.reports;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.capa.CapaRepository;
import com.eqms.changecontrol.ChangeControlRepository;
import com.eqms.deviations.DeviationRepository;
import com.eqms.documents.DocumentRepository;
import com.eqms.documents.DocumentStatus;
import com.eqms.reports.dto.ExportResult;
import com.eqms.reports.dto.ReportData;
import com.eqms.shared.constants.AuditAction;

/**
 * Builds cross-module reports and renders downloadable exports. Viewing a report on screen is a
 * plain read; <em>exporting</em> regulated data is an auditable action (CLAUDE.md M10 — every export
 * records who produced it, when, and links to the audit entry), so {@link #export} writes an
 * {@link AuditAction#EXPORT} entry in the same transaction as the render.
 */
@Service
public class ReportService {

    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_INSTANT;

    private static final String CSV_CONTENT_TYPE = "text/csv";
    private static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final DocumentRepository documents;
    private final ChangeControlRepository changes;
    private final DeviationRepository deviations;
    private final CapaRepository capas;
    private final AuditService auditService;
    private final Clock clock;

    public ReportService(DocumentRepository documents, ChangeControlRepository changes,
                         DeviationRepository deviations, CapaRepository capas,
                         AuditService auditService, Clock utcClock) {
        this.documents = documents;
        this.changes = changes;
        this.deviations = deviations;
        this.capas = capas;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    // --- On-screen (non-audited) report data ---------------------------------------------------

    @Transactional(readOnly = true)
    public ReportData documentsReport(DocumentStatus status) {
        List<List<String>> rows = (status == null
                ? documents.findAll()
                : documents.findByDocumentStatus(status, Pageable.unpaged()).getContent())
                .stream()
                .map(d -> List.of(
                        d.getDocumentNumber(), d.getTitle(), d.getDocumentType().name(),
                        d.getDocumentStatus().name(), String.valueOf(d.getVersion()),
                        ts(d.getEffectiveDate()), ts(d.getCreatedAt())))
                .toList();
        return new ReportData("Documents",
                List.of("Number", "Title", "Type", "Status", "Version", "Effective Date", "Created"),
                rows);
    }

    @Transactional(readOnly = true)
    public ReportData changesReport() {
        List<List<String>> rows = changes.findAll().stream()
                .map(c -> List.of(
                        c.getChangeNumber(), c.getTitle(), c.getChangeType().name(),
                        c.getChangeStatus().name(), ts(c.getTargetImplementationDate()), ts(c.getCreatedAt())))
                .toList();
        return new ReportData("Change Controls",
                List.of("Number", "Title", "Type", "Status", "Target Implementation", "Created"),
                rows);
    }

    @Transactional(readOnly = true)
    public ReportData deviationsReport() {
        List<List<String>> rows = deviations.findAll().stream()
                .sorted(Comparator.comparing(d -> d.getSeverity().name()))
                .map(d -> List.of(
                        d.getDeviationNumber(), d.getTitle(), d.getSeverity().name(),
                        d.getDeviationStatus().name(), ts(d.getOccurredDate()), ts(d.getCreatedAt())))
                .toList();
        return new ReportData("Deviations (by severity)",
                List.of("Number", "Title", "Severity", "Status", "Occurred", "Created"),
                rows);
    }

    @Transactional(readOnly = true)
    public ReportData capaReport() {
        List<List<String>> rows = capas.findAll().stream()
                .sorted(Comparator.comparing(c -> c.getSource().name()))
                .map(c -> List.of(
                        c.getCapaNumber(), c.getTitle(), c.getSource().name(),
                        c.getCapaStatus().name(), ts(c.getDueDate()), ts(c.getCreatedAt())))
                .toList();
        return new ReportData("CAPA (by source)",
                List.of("Number", "Title", "Source", "Status", "Due Date", "Created"),
                rows);
    }

    @Transactional(readOnly = true)
    public ReportData build(ReportType type) {
        return switch (type) {
            case DOCUMENTS -> documentsReport(null);
            case CHANGES -> changesReport();
            case DEVIATIONS -> deviationsReport();
            case CAPA -> capaReport();
        };
    }

    // --- Audited export --------------------------------------------------------------------------

    @Transactional
    public ExportResult export(ReportType type, ReportFormat format,
                               Long actorId, String actorName, String ip, String userAgent) {
        ReportData data = build(type);

        // Audit the export first so we can embed the audit entry id as the file's traceability reference.
        AuditLog entry = auditService.record(AuditEntryRequest.builder()
                .recordType("Report").recordId(type.name())
                .action(AuditAction.EXPORT)
                .newValue("format=" + format.name() + ", rows=" + data.rows().size())
                .reasonForChange("Report exported")
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(userAgent)
                .build());

        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("Report", data.title());
        metadata.put("Generated At (UTC)", Instant.now(clock).atOffset(ZoneOffset.UTC).format(TS));
        metadata.put("Exported By", actorName + " (#" + actorId + ")");
        metadata.put("Audit Reference", "audit_log:" + entry.getId());

        byte[] content;
        String contentType;
        String extension;
        if (format == ReportFormat.XLSX) {
            content = ReportExporter.toXlsx(data, metadata);
            contentType = XLSX_CONTENT_TYPE;
            extension = "xlsx";
        } else {
            content = ReportExporter.toCsv(data, metadata);
            contentType = CSV_CONTENT_TYPE;
            extension = "csv";
        }

        String date = Instant.now(clock).atOffset(ZoneOffset.UTC).toLocalDate().toString();
        String filename = type.name().toLowerCase() + "-report-" + date + "." + extension;
        return new ExportResult(filename, contentType, content);
    }

    private static String ts(Instant instant) {
        return instant == null ? "" : TS.format(instant);
    }
}
