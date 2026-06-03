package com.eqms.capa;

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
import com.eqms.capa.dto.CreateCapaActionRequest;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowService;

/**
 * CAPA application service. Status changes go through {@link WorkflowService}; the approval and
 * closure signatures through {@link SignatureService}; numbering through {@link SequenceService}.
 * Field edits (root cause) and action-item changes are version-checked and audited here.
 */
@Service
public class CapaService {

    private static final String CAPA_PREFIX = "CAPA";

    private final CapaRepository capaRepository;
    private final CapaActionRepository actionRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public CapaService(CapaRepository capaRepository, CapaActionRepository actionRepository,
                       SequenceService sequenceService, WorkflowService workflowService,
                       SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.capaRepository = capaRepository;
        this.actionRepository = actionRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Capa create(CreateCapaRequest request, Long actorId, String actorName, String ip, String userAgent) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(CAPA_PREFIX, year);

        Capa capa = new Capa();
        capa.setCapaNumber(number);
        capa.setTitle(request.title());
        capa.setSource(request.source());
        capa.setDescription(request.description());
        capa.setEffectivenessCheckRequired(request.effectivenessCheckRequired());
        capa.setDueDate(request.dueDate());
        capa.setCapaStatus(CapaStatus.DRAFT);
        capa = capaRepository.save(capa);

        audit(capa.getId(), AuditAction.CREATE, null, null, number,
                "CAPA created", actorId, actorName, ip, userAgent);
        return capa;
    }

    @Transactional(readOnly = true)
    public Page<Capa> list(CapaStatus status, Pageable pageable) {
        return status == null ? capaRepository.findAll(pageable) : capaRepository.findByCapaStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Capa get(Long id) {
        return requireCapa(id);
    }

    /** Edit the root-cause field (version-checked, audited) — a non-status edit. */
    @Transactional
    public Capa updateRootCause(Long id, int expectedVersion, String rootCause, String reason,
                                Long actorId, String actorName, String ip, String userAgent) {
        Capa capa = requireCapa(id);
        checkVersion(capa.getVersion(), expectedVersion);
        String previous = capa.getRootCause();
        capa.setRootCause(rootCause);
        audit(capa.getId(), AuditAction.UPDATE, "root_cause", previous, rootCause,
                reason != null ? reason : "Root cause updated", actorId, actorName, ip, userAgent);
        return capa;
    }

    @Transactional
    public Capa submitForInvestigation(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        transition(capa, CapaWorkflow.SUBMIT_FOR_INVESTIGATION, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa submitForApproval(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        capa.setSubmittedBy(actorId);
        transition(capa, CapaWorkflow.SUBMIT_FOR_APPROVAL, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa approve(Long id, int v, String reason, String password, String totpCode,
                        boolean firstSignatureInSession, String meaningStatement,
                        Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        sign(capa, password, totpCode, firstSignatureInSession,
                meaningStatement != null ? meaningStatement : "I approve this CAPA plan.", actorId, ip, ua);
        transition(capa, CapaWorkflow.APPROVE, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa reject(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        transition(capa, CapaWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa startActions(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        transition(capa, CapaWorkflow.START_ACTIONS, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa submitForEffectiveness(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        transition(capa, CapaWorkflow.SUBMIT_FOR_EFFECTIVENESS, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa close(Long id, int v, String reason, String password, String totpCode,
                      boolean firstSignatureInSession, String meaningStatement, String effectivenessResult,
                      Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        capa.setEffectivenessCheckResult(effectivenessResult);
        capa.setClosedDate(Instant.now(clock));
        sign(capa, password, totpCode, firstSignatureInSession,
                meaningStatement != null ? meaningStatement : "I confirm this CAPA is effective and closed.",
                actorId, ip, ua);
        transition(capa, CapaWorkflow.CLOSE, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Capa cancel(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Capa capa = requireCapa(id);
        transition(capa, CapaWorkflow.CANCEL, v, reason, actorId, actorName, ip, ua);
        return capa;
    }

    // --- action items ---------------------------------------------------------------------

    @Transactional
    public CapaAction addAction(Long capaId, CreateCapaActionRequest request,
                                Long actorId, String actorName, String ip, String userAgent) {
        Capa capa = requireCapa(capaId);
        CapaAction action = new CapaAction();
        action.setCapaId(capa.getId());
        action.setActionType(request.actionType());
        action.setDescription(request.description());
        action.setAssignedTo(request.assignedTo());
        action.setDueDate(request.dueDate());
        action = actionRepository.save(action);

        auditService.record(AuditEntryRequest.builder()
                .recordType("CapaAction").recordId(String.valueOf(action.getId()))
                .action(AuditAction.CREATE)
                .newValue(request.actionType().name() + " action for CAPA " + capa.getCapaNumber())
                .reasonForChange("CAPA action item added")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(userAgent)
                .build());
        return action;
    }

    @Transactional
    public CapaAction completeAction(Long actionId, Long actorId, String actorName, String ip, String userAgent) {
        CapaAction action = actionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("CAPA action not found: " + actionId));
        action.setCompletedDate(Instant.now(clock));
        auditService.record(AuditEntryRequest.builder()
                .recordType("CapaAction").recordId(String.valueOf(action.getId()))
                .action(AuditAction.UPDATE)
                .fieldName("completed_date").newValue("completed")
                .reasonForChange("CAPA action item completed")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(userAgent)
                .build());
        return action;
    }

    @Transactional(readOnly = true)
    public List<CapaAction> listActions(Long capaId) {
        requireCapa(capaId);
        return actionRepository.findByCapaIdOrderByIdAsc(capaId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        requireCapa(id);
        return auditService.trailFor(CapaWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals ------------------------------------------------------------------------

    private void sign(Capa capa, String password, String totpCode, boolean firstSignatureInSession,
                      String meaningStatement, Long actorId, String ip, String userAgent) {
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(CapaWorkflow.RECORD_TYPE).recordId(String.valueOf(capa.getId()))
                .contentHash(capa.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement)
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(userAgent)
                .build());
    }

    private void transition(Capa capa, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(CapaWorkflow.DEFINITION, capa,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(userAgent)
                        .build());
    }

    private void audit(Long capaId, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String userAgent) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(CapaWorkflow.RECORD_TYPE).recordId(String.valueOf(capaId))
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

    private Capa requireCapa(Long id) {
        return capaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CAPA not found: " + id));
    }
}
