package com.eqms.deviations;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.deviations.dto.CreateDeviationRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowService;

/**
 * Deviation application service. Status changes via {@link WorkflowService}, the approval signature
 * via {@link SignatureService}, numbering via {@link SequenceService}. The root-cause edit is
 * version-checked and audited here.
 */
@Service
public class DeviationService {

    private static final String DEV_PREFIX = "DEV";

    private final DeviationRepository repository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public DeviationService(DeviationRepository repository, SequenceService sequenceService,
                            WorkflowService workflowService, SignatureService signatureService,
                            AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Deviation create(CreateDeviationRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(DEV_PREFIX, year);

        Deviation deviation = new Deviation();
        deviation.setDeviationNumber(number);
        deviation.setTitle(request.title());
        deviation.setSeverity(request.severity());
        deviation.setDescription(request.description());
        deviation.setImmediateAction(request.immediateAction());
        deviation.setOccurredDate(request.occurredDate());
        deviation.setDeviationStatus(DeviationStatus.DRAFT);
        deviation = repository.save(deviation);

        audit(deviation.getId(), AuditAction.CREATE, null, null, number,
                "Deviation created", actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional(readOnly = true)
    public Page<Deviation> list(DeviationStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable) : repository.findByDeviationStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Deviation get(Long id) {
        return require(id);
    }

    @Transactional
    public Deviation updateRootCause(Long id, int expectedVersion, String rootCause, String reason,
                                     Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        checkVersion(deviation.getVersion(), expectedVersion);
        String previous = deviation.getRootCause();
        deviation.setRootCause(rootCause);
        audit(deviation.getId(), AuditAction.UPDATE, "root_cause", previous, rootCause,
                reason != null ? reason : "Root cause updated", actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation submitForInvestigation(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        transition(deviation, DeviationWorkflow.SUBMIT_FOR_INVESTIGATION, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation submitForApproval(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        deviation.setSubmittedBy(actorId);
        transition(deviation, DeviationWorkflow.SUBMIT_FOR_APPROVAL, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation approve(Long id, int v, String reason, String password, String totpCode,
                             boolean firstSignatureInSession, String meaningStatement,
                             Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(DeviationWorkflow.RECORD_TYPE).recordId(String.valueOf(deviation.getId()))
                .contentHash(deviation.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement : "I approve this deviation disposition.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        transition(deviation, DeviationWorkflow.APPROVE, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation reject(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        transition(deviation, DeviationWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation close(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        deviation.setClosedDate(Instant.now(clock));
        transition(deviation, DeviationWorkflow.CLOSE, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation cancel(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        transition(deviation, DeviationWorkflow.CANCEL, v, reason, actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(DeviationWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(Deviation deviation, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(DeviationWorkflow.DEFINITION, deviation,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(userAgent)
                        .build());
    }

    private void audit(Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String userAgent) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(DeviationWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(userAgent)
                .build());
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private Deviation require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Deviation not found: " + id));
    }
}
