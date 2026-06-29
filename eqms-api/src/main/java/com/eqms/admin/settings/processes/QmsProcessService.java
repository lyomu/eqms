package com.eqms.admin.settings.processes;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.eqms.admin.settings.processes.dto.QmsProcessRequest;
import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.common.HtmlSanitizer;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.workflows.StaleVersionException;

@Service
public class QmsProcessService {

    private static final String RECORD_TYPE = "QmsProcess";
    private static final String PREFIX = "PROC";

    private final QmsProcessRepository repository;
    private final SequenceService sequenceService;
    private final AuditService auditService;
    private final Clock clock;

    public QmsProcessService(QmsProcessRepository repository, SequenceService sequenceService,
                             AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.sequenceService = sequenceService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional(readOnly = true)
    public List<QmsProcess> list(Long organizationId) {
        return repository.findByOrganizationIdOrderByNameAsc(organizationId);
    }

    @Transactional(readOnly = true)
    public QmsProcess get(Long organizationId, Long id) {
        QmsProcess process = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("QMS process not found: " + id));
        if (!organizationId.equals(process.getOrganizationId())) {
            throw new ResourceNotFoundException("QMS process not found: " + id);
        }
        return process;
    }

    @Transactional
    public QmsProcess create(Long organizationId, QmsProcessRequest request,
                             Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        QmsProcess process = new QmsProcess();
        process.setOrganizationId(organizationId);
        process.setProcessCode(sequenceService.next(PREFIX, year));
        apply(process, request);
        process = repository.save(process);
        audit(process, AuditAction.CREATE, "Process created", actorId, actorName, ip, ua);
        return process;
    }

    @Transactional
    public QmsProcess update(Long organizationId, Long id, QmsProcessRequest request,
                             Long actorId, String actorName, String ip, String ua) {
        QmsProcess process = get(organizationId, id);
        if (request.expectedVersion() == null) {
            throw new IllegalArgumentException("expectedVersion is required when updating a QMS process.");
        }
        if (process.getVersion() != request.expectedVersion()) {
            throw new StaleVersionException("Stale version for QMS process " + id + ": record is at v"
                    + process.getVersion() + " but the request was made against v" + request.expectedVersion());
        }
        QmsProcessStatus oldStatus = process.getStatus();
        apply(process, request);
        audit(process, oldStatus == process.getStatus() ? AuditAction.UPDATE : AuditAction.STATUS_CHANGE,
                StringUtils.hasText(request.reason()) ? request.reason() : "QMS process updated",
                actorId, actorName, ip, ua);
        return process;
    }

    private void apply(QmsProcess process, QmsProcessRequest r) {
        process.setName(r.name().trim());
        process.setProcessOwnerId(r.processOwnerId());
        process.setDepartment(blankToNull(r.department()));
        process.setPurpose(sanitize(r.purpose()));
        process.setInputs(sanitize(r.inputs()));
        process.setOutputs(sanitize(r.outputs()));
        process.setKpis(sanitize(r.kpis()));
        process.setLinkedDocuments(sanitize(r.linkedDocuments()));
        process.setLinkedRisks(sanitize(r.linkedRisks()));
        process.setLinkedTraining(sanitize(r.linkedTraining()));
        process.setRecordsGenerated(sanitize(r.recordsGenerated()));
        process.setReviewFrequencyMonths(r.reviewFrequencyMonths() == null ? 12 : r.reviewFrequencyMonths());
        process.setNextReviewDate(r.nextReviewDate());
        process.setStatus(r.status() == null ? QmsProcessStatus.DRAFT : r.status());
    }

    private void audit(QmsProcess process, AuditAction action, String reason,
                       Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(RECORD_TYPE).recordId(String.valueOf(process.getId()))
                .action(action)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(ua)
                .build());
    }

    private static String sanitize(String value) {
        return value == null || value.isBlank() ? null : HtmlSanitizer.sanitize(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
