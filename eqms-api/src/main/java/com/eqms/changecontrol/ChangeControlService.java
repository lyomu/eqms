package com.eqms.changecontrol;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.changecontrol.dto.CreateChangeControlRequest;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowService;

/**
 * Change Control application service. Mirrors the Document Control pattern: numbering via
 * {@link SequenceService}, all status changes via {@link WorkflowService}, approval signing via
 * {@link SignatureService}. No workflow or signature logic of its own.
 */
@Service
public class ChangeControlService {

    private static final String CC_PREFIX = "CC";

    private final ChangeControlRepository repository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public ChangeControlService(ChangeControlRepository repository, SequenceService sequenceService,
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
    public ChangeControl create(CreateChangeControlRequest request,
                                Long actorId, String actorName, String ip, String userAgent) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(CC_PREFIX, year);

        ChangeControl cc = new ChangeControl();
        cc.setChangeNumber(number);
        cc.setTitle(request.title());
        cc.setChangeType(request.type());
        cc.setDescription(request.description());
        cc.setJustification(request.justification());
        cc.setEffectivenessCheckRequired(request.effectivenessCheckRequired());
        cc.setTargetImplementationDate(request.targetImplementationDate());
        cc.setChangeStatus(ChangeControlStatus.DRAFT);
        cc = repository.save(cc);

        auditService.record(AuditEntryRequest.builder()
                .recordType(ChangeControlWorkflow.RECORD_TYPE).recordId(String.valueOf(cc.getId()))
                .action(AuditAction.CREATE)
                .newValue(number)
                .reasonForChange("Change control created")
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(userAgent)
                .build());
        return cc;
    }

    @Transactional(readOnly = true)
    public Page<ChangeControl> list(ChangeControlStatus status, Pageable pageable) {
        return status == null
                ? repository.findAll(pageable)
                : repository.findByChangeStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public ChangeControl get(Long id) {
        return require(id);
    }

    @Transactional
    public ChangeControl submitForReview(Long id, int expectedVersion, String reason,
                                         Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.SUBMIT_FOR_REVIEW, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl submitForApproval(Long id, int expectedVersion, String reason,
                                           Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        cc.setSubmittedBy(actorId);
        transition(cc, ChangeControlWorkflow.SUBMIT_FOR_APPROVAL, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl approve(Long id, int expectedVersion, String reason, String password, String totpCode,
                                 boolean firstSignatureInSession, String meaningStatement,
                                 Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(ChangeControlWorkflow.RECORD_TYPE).recordId(String.valueOf(cc.getId()))
                .contentHash(cc.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I approve this change control.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(userAgent)
                .build());

        transition(cc, ChangeControlWorkflow.APPROVE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl reject(Long id, int expectedVersion, String reason,
                                Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.REJECT, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl startImplementation(Long id, int expectedVersion, String reason,
                                             Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.START_IMPLEMENTATION, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl completeImplementation(Long id, int expectedVersion, String reason,
                                                Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        cc.setImplementedDate(Instant.now(clock));
        transition(cc, ChangeControlWorkflow.COMPLETE_IMPLEMENTATION, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl submitForClosure(Long id, int expectedVersion, String reason,
                                          Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.SUBMIT_FOR_CLOSURE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl close(Long id, int expectedVersion, String reason,
                               Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        cc.setClosedDate(Instant.now(clock));
        transition(cc, ChangeControlWorkflow.CLOSE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl cancel(Long id, int expectedVersion, String reason,
                                Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.CANCEL, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional(readOnly = true)
    public java.util.List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(ChangeControlWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(ChangeControl cc, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(ChangeControlWorkflow.DEFINITION, cc,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(userAgent)
                        .build());
    }

    private ChangeControl require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Change control not found: " + id));
    }
}
