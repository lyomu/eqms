package com.eqms.audits;

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
import com.eqms.audits.dto.CreateAuditRequest;
import com.eqms.audits.dto.CreateCapaFromFindingRequest;
import com.eqms.audits.dto.PlanAuditRequest;
import com.eqms.audits.dto.RecordFindingRequest;
import com.eqms.audits.dto.UpdateAuditRequest;
import com.eqms.capa.Capa;
import com.eqms.capa.CapaService;
import com.eqms.capa.CapaSource;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

/**
 * Audit Management application service. Status changes go through {@link WorkflowService}; the
 * completion sign-off signature through {@link SignatureService}; numbering through
 * {@link SequenceService}. Findings/CAPA-links/follow-ups live in child tables; a finding can spawn
 * a CAPA via {@link CapaService}.
 *
 * <p>Named {@code AuditManagementService} (not {@code AuditService}) to avoid colliding with the
 * system audit-trail service in {@code com.eqms.audit}.</p>
 */
@Service
public class AuditManagementService {

    private static final String AUDIT_PREFIX = "AUD";

    private final AuditRepository repository;
    private final AuditFindingRepository findingRepository;
    private final AuditCapaLinkRepository capaLinkRepository;
    private final AuditFollowUpRepository followUpRepository;
    private final CapaService capaService;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public AuditManagementService(AuditRepository repository, AuditFindingRepository findingRepository,
                                  AuditCapaLinkRepository capaLinkRepository,
                                  AuditFollowUpRepository followUpRepository, CapaService capaService,
                                  SequenceService sequenceService, WorkflowService workflowService,
                                  SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.findingRepository = findingRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.followUpRepository = followUpRepository;
        this.capaService = capaService;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Audit create(CreateAuditRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(AUDIT_PREFIX, year);

        Audit audit = new Audit();
        audit.setAuditNo(number);
        audit.setAuditTitle(request.auditTitle());
        audit.setAuditType(request.auditType());
        audit.setScope(request.scope());
        audit.setAuditDate(request.auditDate());
        audit.setAuditeeId(request.auditeeId());
        audit.setAuditStatus(AuditStatus.PLANNED);
        audit = repository.save(audit);

        audit(number, audit.getId(), AuditAction.CREATE, null, null, number,
                "Audit created", actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional(readOnly = true)
    public Page<Audit> list(AuditStatus status, AuditType type, Pageable pageable) {
        if (status != null) {
            return repository.findByAuditStatus(status, pageable);
        }
        if (type != null) {
            return repository.findByAuditType(type, pageable);
        }
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Audit get(Long id) {
        return require(id);
    }

    @Transactional(readOnly = true)
    public List<AuditFinding> findings(Long auditId) {
        require(auditId);
        return findingRepository.findByAuditIdOrderByFindingNumberAsc(auditId);
    }

    @Transactional(readOnly = true)
    public List<AuditFollowUp> followUps(Long auditId) {
        require(auditId);
        return followUpRepository.findByCurrentAuditId(auditId);
    }

    @Transactional
    public Audit update(Long id, UpdateAuditRequest request, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        checkVersion(audit.getVersion(), request.expectedVersion());
        if (audit.getAuditStatus() != AuditStatus.PLANNED) {
            throw new WorkflowException("Audit details can only be edited while PLANNED");
        }
        if (request.auditTitle() != null) {
            audit.setAuditTitle(request.auditTitle());
        }
        if (request.scope() != null) {
            audit.setScope(request.scope());
        }
        if (request.auditDate() != null) {
            audit.setAuditDate(request.auditDate());
        }
        if (request.auditeeId() != null) {
            audit.setAuditeeId(request.auditeeId());
        }
        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Audit details updated", actorId, actorName, ip, ua);
        return audit;
    }

    /** Define the plan (scope/auditee/date) and begin fieldwork (PLANNED -> IN_PROGRESS). */
    @Transactional
    public Audit plan(Long id, PlanAuditRequest request, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        audit.setScope(request.scope());
        if (request.auditeeId() != null) {
            audit.setAuditeeId(request.auditeeId());
        }
        if (request.auditDate() != null) {
            audit.setAuditDate(request.auditDate());
        }
        // The conductor of the audit is recorded so they cannot also sign off its completion (rule 7).
        audit.setAuditorId(actorId);
        audit.setSubmittedBy(actorId);
        transition(audit, AuditWorkflow.START, request.expectedVersion(), request.reason(), actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional
    public AuditFinding recordFinding(Long id, RecordFindingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        if (audit.getAuditStatus() != AuditStatus.IN_PROGRESS) {
            throw new WorkflowException("Findings can only be recorded while the audit is IN_PROGRESS");
        }
        int number = (int) findingRepository.countByAuditId(id) + 1;
        AuditFinding finding = new AuditFinding();
        finding.setAuditId(id);
        finding.setFindingNumber(number);
        finding.setDescription(request.description());
        finding.setArea(request.area());
        finding.setSeverity(request.severity());
        finding.setEvidence(request.evidence());
        finding.setRootCause(request.rootCause());
        // Critical findings always require a corrective action (business rule).
        finding.setCorrectiveActionRequired(request.correctiveActionRequired()
                || request.severity() == FindingSeverity.CRITICAL);
        finding = findingRepository.save(finding);

        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "finding", null,
                "Finding #" + number + " (" + request.severity() + ")",
                "Audit finding recorded", actorId, actorName, ip, ua);
        return finding;
    }

    @Transactional
    public Capa createCapaFromFinding(Long id, CreateCapaFromFindingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        AuditFinding finding = findingRepository.findById(request.findingId())
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + request.findingId()));
        if (!finding.getAuditId().equals(id)) {
            throw new WorkflowException("Finding " + request.findingId() + " does not belong to audit " + id);
        }
        String title = (request.title() != null && !request.title().isBlank())
                ? request.title()
                : "CAPA for audit " + audit.getAuditNo() + " finding #" + finding.getFindingNumber();
        String description = (request.description() != null && !request.description().isBlank())
                ? request.description()
                : finding.getDescription();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.AUDIT_FINDING, description,
                        request.effectivenessCheckRequired(), request.dueDate(),
                        null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null),
                actorId, actorName, ip, ua);

        AuditCapaLink link = new AuditCapaLink();
        link.setAuditFindingId(finding.getId());
        link.setCapaId(capa.getId());
        capaLinkRepository.save(link);

        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "capa_link", null,
                "CAPA " + capa.getCapaNumber() + " for finding #" + finding.getFindingNumber(),
                request.reason() != null ? request.reason() : "CAPA created from audit finding",
                actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public Audit finalizeAudit(Long id, int v, String reason, String password, String totpCode,
                               boolean firstSignatureInSession, String meaningStatement,
                               Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(AuditWorkflow.RECORD_TYPE).recordId(String.valueOf(audit.getId()))
                .contentHash(audit.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I confirm this audit is complete and approve its findings.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        audit.setCompletedDate(Instant.now(clock));
        transition(audit, AuditWorkflow.FINALIZE, v, reason, actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional
    public AuditFollowUp recordFollowUp(Long id, Long previousAuditId, Long findingId, FollowUpStatus status,
                                        String notes, int expectedVersion, String reason,
                                        Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        require(previousAuditId);

        AuditFollowUp followUp = new AuditFollowUp();
        followUp.setCurrentAuditId(id);
        followUp.setPreviousAuditId(previousAuditId);
        followUp.setFindingId(findingId);
        followUp.setStatus(status);
        followUp.setNotes(notes);
        followUp = followUpRepository.save(followUp);

        // A completed audit that begins tracking follow-up items moves into the FOLLOW_UP state.
        if (audit.getAuditStatus() == AuditStatus.COMPLETED) {
            transition(audit, AuditWorkflow.INITIATE_FOLLOW_UP, expectedVersion, reason, actorId, actorName, ip, ua);
        } else {
            audit(audit.getAuditNo(), id, AuditAction.UPDATE, "follow_up", null,
                    "Follow-up on audit " + previousAuditId + " (" + status + ")",
                    reason != null ? reason : "Follow-up recorded", actorId, actorName, ip, ua);
        }
        return followUp;
    }

    @Transactional
    public Audit cancel(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        transition(audit, AuditWorkflow.CANCEL, v, reason, actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(AuditWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals -----------------------------------------------------------------------------

    private void transition(Audit audit, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(AuditWorkflow.DEFINITION, audit,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(ua)
                        .build());
    }

    private void audit(String auditNo, Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(AuditWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private Audit require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audit not found: " + id));
    }
}
