package com.eqms.audits;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.audits.dto.AcknowledgeFindingRequest;
import com.eqms.audits.dto.CloseAuditRequest;
import com.eqms.audits.dto.CloseFindingRequest;
import com.eqms.audits.dto.CreateActionPlanRequest;
import com.eqms.audits.dto.CreateAuditRequest;
import com.eqms.audits.dto.CreateCapaFromFindingRequest;
import com.eqms.audits.dto.CreateChecklistItemRequest;
import com.eqms.audits.dto.CreateEvidenceRequest;
import com.eqms.audits.dto.CreateFindingRequest;
import com.eqms.audits.dto.CreateLinkedRecordRequest;
import com.eqms.audits.dto.CreateMeetingRequest;
import com.eqms.audits.dto.PlanAuditRequest;
import com.eqms.audits.dto.RecordFindingRequest;
import com.eqms.audits.dto.ReopenAuditRequest;
import com.eqms.audits.dto.UpdateActionPlanRequest;
import com.eqms.audits.dto.UpdateAuditDetailsRequest;
import com.eqms.audits.dto.UpdateAuditRequest;
import com.eqms.audits.dto.UpdateChecklistItemRequest;
import com.eqms.audits.dto.UpdateFindingRequest;
import com.eqms.audits.dto.UpdateMeetingRequest;
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
    private final AuditChecklistItemRepository checklistRepository;
    private final AuditEvidenceRepository evidenceRepository;
    private final AuditActionPlanRepository actionPlanRepository;
    private final AuditMeetingRepository meetingRepository;
    private final AuditLinkedRecordRepository linkedRecordRepository;
    private final CapaService capaService;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public AuditManagementService(AuditRepository repository, AuditFindingRepository findingRepository,
                                  AuditCapaLinkRepository capaLinkRepository,
                                  AuditFollowUpRepository followUpRepository,
                                  AuditChecklistItemRepository checklistRepository,
                                  AuditEvidenceRepository evidenceRepository,
                                  AuditActionPlanRepository actionPlanRepository,
                                  AuditMeetingRepository meetingRepository,
                                  AuditLinkedRecordRepository linkedRecordRepository,
                                  CapaService capaService,
                                  SequenceService sequenceService, WorkflowService workflowService,
                                  SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.findingRepository = findingRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.followUpRepository = followUpRepository;
        this.checklistRepository = checklistRepository;
        this.evidenceRepository = evidenceRepository;
        this.actionPlanRepository = actionPlanRepository;
        this.meetingRepository = meetingRepository;
        this.linkedRecordRepository = linkedRecordRepository;
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
        audit.setObjective(request.objective());
        audit.setCriteria(request.criteria());
        audit.setAuditDate(request.auditDate());
        audit.setAuditeeId(request.auditeeId());
        audit.setAuditStatus(AuditStatus.PLANNED);

        if (request.category() != null) {
            audit.setCategory(AuditCategory.valueOf(request.category()));
        }
        audit.setDepartment(request.department());
        audit.setProcessArea(request.processArea());
        audit.setSite(request.site());
        audit.setRelatedModule(request.relatedModule());
        if (request.riskLevel() != null) {
            audit.setRiskLevel(AuditRiskLevel.valueOf(request.riskLevel()));
        }
        audit.setPlannedStartDate(request.plannedStartDate());
        audit.setPlannedEndDate(request.plannedEndDate());
        audit.setLeadAuditorId(request.leadAuditorId());
        audit.setAuditeeOwnerId(request.auditeeOwnerId());
        audit.setAuditSponsorId(request.auditSponsorId());
        if (request.method() != null) {
            audit.setMethod(AuditMethod.valueOf(request.method()));
        }
        if (request.frequency() != null) {
            audit.setFrequency(AuditFrequency.valueOf(request.frequency()));
        }
        if (request.reasonForAudit() != null) {
            audit.setReasonForAudit(ReasonForAudit.valueOf(request.reasonForAudit()));
        }
        if (request.checklistRequired() != null) {
            audit.setChecklistRequired(request.checklistRequired());
        }
        if (request.openingMeetingRequired() != null) {
            audit.setOpeningMeetingRequired(request.openingMeetingRequired());
        }
        if (request.closingMeetingRequired() != null) {
            audit.setClosingMeetingRequired(request.closingMeetingRequired());
        }

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

    @Transactional
    public Audit updateDetails(Long id, UpdateAuditDetailsRequest request,
                               Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        checkVersion(audit.getVersion(), request.expectedVersion());

        if (request.auditTitle() != null) audit.setAuditTitle(request.auditTitle());
        if (request.auditType() != null) audit.setAuditType(AuditType.valueOf(request.auditType()));
        if (request.objective() != null) audit.setObjective(request.objective());
        if (request.scope() != null) audit.setScope(request.scope());
        if (request.criteria() != null) audit.setCriteria(request.criteria());
        if (request.category() != null) audit.setCategory(AuditCategory.valueOf(request.category()));
        if (request.department() != null) audit.setDepartment(request.department());
        if (request.processArea() != null) audit.setProcessArea(request.processArea());
        if (request.site() != null) audit.setSite(request.site());
        if (request.relatedModule() != null) audit.setRelatedModule(request.relatedModule());
        if (request.riskLevel() != null) audit.setRiskLevel(AuditRiskLevel.valueOf(request.riskLevel()));
        if (request.plannedStartDate() != null) audit.setPlannedStartDate(request.plannedStartDate());
        if (request.plannedEndDate() != null) audit.setPlannedEndDate(request.plannedEndDate());
        if (request.leadAuditorId() != null) audit.setLeadAuditorId(request.leadAuditorId());
        if (request.auditTeamMembers() != null) audit.setAuditTeamMembers(request.auditTeamMembers());
        if (request.auditeeOwnerId() != null) audit.setAuditeeOwnerId(request.auditeeOwnerId());
        if (request.auditSponsorId() != null) audit.setAuditSponsorId(request.auditSponsorId());
        if (request.method() != null) audit.setMethod(AuditMethod.valueOf(request.method()));
        if (request.frequency() != null) audit.setFrequency(AuditFrequency.valueOf(request.frequency()));
        if (request.reasonForAudit() != null) audit.setReasonForAudit(ReasonForAudit.valueOf(request.reasonForAudit()));
        if (request.checklistRequired() != null) audit.setChecklistRequired(request.checklistRequired());
        if (request.openingMeetingRequired() != null) audit.setOpeningMeetingRequired(request.openingMeetingRequired());
        if (request.closingMeetingRequired() != null) audit.setClosingMeetingRequired(request.closingMeetingRequired());
        if (request.auditorIndependenceConfirmed() != null) audit.setAuditorIndependenceConfirmed(request.auditorIndependenceConfirmed());

        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Audit details updated", actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional
    public Audit close(Long id, CloseAuditRequest request, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        checkVersion(audit.getVersion(), request.expectedVersion());
        audit.setAuditStatus(AuditStatus.CLOSED);
        audit.setClosureStatus(ClosureStatus.CLOSED);
        audit.setClosedById(actorId);
        audit.setClosedAt(Instant.now(clock));
        audit.setClosureComments(request.closureComments());
        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "status", audit.getAuditStatus().name(),
                AuditStatus.CLOSED.name(),
                request.reason() != null ? request.reason() : "Audit closed",
                actorId, actorName, ip, ua);
        return audit;
    }

    @Transactional
    public Audit reopen(Long id, ReopenAuditRequest request, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        checkVersion(audit.getVersion(), request.expectedVersion());
        String prevStatus = audit.getAuditStatus().name();
        audit.setAuditStatus(AuditStatus.REOPENED);
        audit.setClosureStatus(ClosureStatus.REOPENED);
        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "status", prevStatus,
                AuditStatus.REOPENED.name(), request.reason(), actorId, actorName, ip, ua);
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
        finding.setCorrectiveActionRequired(request.correctiveActionRequired()
                || request.severity() == FindingSeverity.CRITICAL);
        finding.setFindingCode(audit.getAuditNo() + "-F" + String.format("%02d", number));
        finding = findingRepository.save(finding);

        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "finding", null,
                "Finding #" + number + " (" + request.severity() + ")",
                "Audit finding recorded", actorId, actorName, ip, ua);
        return finding;
    }

    @Transactional
    public AuditFinding addFinding(Long id, CreateFindingRequest request,
                                   Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(id);
        int number = (int) findingRepository.countByAuditId(id) + 1;
        FindingSeverity severity = FindingSeverity.valueOf(request.severity());

        AuditFinding finding = new AuditFinding();
        finding.setAuditId(id);
        finding.setFindingNumber(number);
        finding.setFindingCode(audit.getAuditNo() + "-F" + String.format("%02d", number));
        finding.setTitle(request.title());
        finding.setDescription(request.description());
        if (request.findingType() != null) {
            finding.setFindingType(FindingType.valueOf(request.findingType()));
        }
        finding.setArea(request.area());
        finding.setSeverity(severity);
        if (request.riskLevel() != null) {
            finding.setRiskLevel(AuditRiskLevel.valueOf(request.riskLevel()));
        }
        finding.setRequirementReference(request.requirementReference());
        finding.setEvidence(request.evidence());
        finding.setRootCause(request.rootCause());
        boolean caRequired = (request.correctiveActionRequired() != null && request.correctiveActionRequired())
                || severity == FindingSeverity.CRITICAL;
        finding.setCorrectiveActionRequired(caRequired);
        if (request.immediateCorrectionRequired() != null) {
            finding.setImmediateCorrectionRequired(request.immediateCorrectionRequired());
        }
        if (request.rootCauseRequired() != null) {
            finding.setRootCauseRequired(request.rootCauseRequired());
        }
        boolean capaReq = (request.capaRequired() != null && request.capaRequired()) || severity == FindingSeverity.CRITICAL;
        finding.setCapaRequired(capaReq);
        finding.setResponsibleOwnerId(request.responsibleOwnerId());
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            finding.setDueDate(LocalDate.parse(request.dueDate()));
        }
        finding.setFindingStatus(FindingStatus.DRAFT);
        finding = findingRepository.save(finding);

        audit(audit.getAuditNo(), id, AuditAction.UPDATE, "finding", null,
                "Finding #" + number + " (" + severity + ")",
                "Audit finding recorded", actorId, actorName, ip, ua);
        return finding;
    }

    @Transactional
    public AuditFinding updateFinding(Long auditId, Long findingId, UpdateFindingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditFinding finding = requireFinding(findingId, auditId);

        if (request.title() != null) finding.setTitle(request.title());
        if (request.description() != null) finding.setDescription(request.description());
        if (request.findingType() != null) finding.setFindingType(FindingType.valueOf(request.findingType()));
        if (request.severity() != null) finding.setSeverity(FindingSeverity.valueOf(request.severity()));
        if (request.riskLevel() != null) finding.setRiskLevel(AuditRiskLevel.valueOf(request.riskLevel()));
        if (request.requirementReference() != null) finding.setRequirementReference(request.requirementReference());
        if (request.evidence() != null) finding.setEvidence(request.evidence());
        if (request.rootCause() != null) finding.setRootCause(request.rootCause());
        if (request.correctiveActionRequired() != null) finding.setCorrectiveActionRequired(request.correctiveActionRequired());
        if (request.immediateCorrectionRequired() != null) finding.setImmediateCorrectionRequired(request.immediateCorrectionRequired());
        if (request.rootCauseRequired() != null) finding.setRootCauseRequired(request.rootCauseRequired());
        if (request.capaRequired() != null) finding.setCapaRequired(request.capaRequired());
        if (request.responsibleOwnerId() != null) finding.setResponsibleOwnerId(request.responsibleOwnerId());
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            finding.setDueDate(LocalDate.parse(request.dueDate()));
        }
        if (request.findingStatus() != null) finding.setFindingStatus(FindingStatus.valueOf(request.findingStatus()));
        if (request.area() != null) finding.setArea(request.area());

        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "finding." + findingId, null,
                "updated", request.reason() != null ? request.reason() : "Finding updated",
                actorId, actorName, ip, ua);
        return finding;
    }

    @Transactional
    public AuditFinding acknowledgeFinding(Long auditId, Long findingId, AcknowledgeFindingRequest request,
                                           Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditFinding finding = requireFinding(findingId, auditId);
        finding.setFindingStatus(FindingStatus.ACKNOWLEDGED);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "finding." + findingId + ".status",
                FindingStatus.ISSUED.name(), FindingStatus.ACKNOWLEDGED.name(),
                request.reason() != null ? request.reason() : "Finding acknowledged",
                actorId, actorName, ip, ua);
        return finding;
    }

    @Transactional
    public AuditFinding closeFinding(Long auditId, Long findingId, CloseFindingRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditFinding finding = requireFinding(findingId, auditId);
        finding.setFindingStatus(FindingStatus.CLOSED);
        finding.setClosedById(actorId);
        finding.setClosedAt(Instant.now(clock));
        finding.setClosureComments(request.closureComments());
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "finding." + findingId + ".status",
                finding.getFindingStatus().name(), FindingStatus.CLOSED.name(),
                "Finding closed", actorId, actorName, ip, ua);
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

    // --- checklist -------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditChecklistItem> getChecklistItems(Long auditId) {
        require(auditId);
        return checklistRepository.findByAuditIdOrderBySortOrderAsc(auditId);
    }

    @Transactional
    public AuditChecklistItem addChecklistItem(Long auditId, CreateChecklistItemRequest request,
                                               Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditChecklistItem item = new AuditChecklistItem();
        item.setAuditId(auditId);
        item.setSection(request.section());
        item.setRequirementReference(request.requirementReference());
        item.setQuestion(request.question());
        item.setExpectedEvidence(request.expectedEvidence());
        if (request.checklistMethod() != null) {
            item.setChecklistMethod(ChecklistMethod.valueOf(request.checklistMethod()));
        }
        item.setResponsibleAuditorId(request.responsibleAuditorId());
        if (request.applicable() != null) item.setApplicable(request.applicable());
        if (request.sortOrder() != null) item.setSortOrder(request.sortOrder());
        item = checklistRepository.save(item);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "checklist_item", null,
                "Item added", "Checklist item added", actorId, actorName, ip, ua);
        return item;
    }

    @Transactional
    public AuditChecklistItem updateChecklistItem(Long auditId, Long itemId, UpdateChecklistItemRequest request,
                                                  Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));
        if (!item.getAuditId().equals(auditId)) {
            throw new WorkflowException("Checklist item " + itemId + " does not belong to audit " + auditId);
        }
        if (request.section() != null) item.setSection(request.section());
        if (request.requirementReference() != null) item.setRequirementReference(request.requirementReference());
        if (request.question() != null) item.setQuestion(request.question());
        if (request.expectedEvidence() != null) item.setExpectedEvidence(request.expectedEvidence());
        if (request.checklistMethod() != null) item.setChecklistMethod(ChecklistMethod.valueOf(request.checklistMethod()));
        if (request.responsibleAuditorId() != null) item.setResponsibleAuditorId(request.responsibleAuditorId());
        if (request.applicable() != null) item.setApplicable(request.applicable());
        if (request.response() != null) item.setResponse(ChecklistResponse.valueOf(request.response()));
        if (request.evidenceSummary() != null) item.setEvidenceSummary(request.evidenceSummary());
        if (request.findingRequired() != null) item.setFindingRequired(request.findingRequired());
        if (request.linkedFindingId() != null) item.setLinkedFindingId(request.linkedFindingId());
        if (request.comments() != null) item.setComments(request.comments());
        if (request.sortOrder() != null) item.setSortOrder(request.sortOrder());
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "checklist_item." + itemId,
                null, "updated", "Checklist item updated", actorId, actorName, ip, ua);
        return item;
    }

    @Transactional
    public void deleteChecklistItem(Long auditId, Long itemId, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist item not found: " + itemId));
        if (!item.getAuditId().equals(auditId)) {
            throw new WorkflowException("Checklist item " + itemId + " does not belong to audit " + auditId);
        }
        checklistRepository.delete(item);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "checklist_item." + itemId,
                "exists", "deleted", "Checklist item deleted", actorId, actorName, ip, ua);
    }

    // --- evidence --------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditEvidence> getEvidence(Long auditId) {
        require(auditId);
        return evidenceRepository.findByAuditIdOrderByCreatedAtAsc(auditId);
    }

    @Transactional
    public AuditEvidence addEvidence(Long auditId, CreateEvidenceRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditEvidence evidence = new AuditEvidence();
        evidence.setAuditId(auditId);
        evidence.setEvidenceType(AuditEvidenceType.valueOf(request.evidenceType()));
        evidence.setDescription(request.description());
        evidence.setReferenceNumber(request.referenceNumber());
        evidence.setAreaAudited(request.areaAudited());
        evidence.setPersonInterviewed(request.personInterviewed());
        evidence.setRecordsReviewed(request.recordsReviewed());
        evidence.setRelatedChecklistItemId(request.relatedChecklistItemId());
        evidence.setRelatedFindingId(request.relatedFindingId());
        evidence.setAuditorNotes(request.auditorNotes());
        evidence = evidenceRepository.save(evidence);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "evidence", null,
                request.evidenceType(), "Evidence recorded", actorId, actorName, ip, ua);
        return evidence;
    }

    // --- action plans ----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditActionPlan> getActionPlans(Long auditId) {
        require(auditId);
        return actionPlanRepository.findByAuditIdOrderByCreatedAtAsc(auditId);
    }

    @Transactional
    public AuditActionPlan addActionPlan(Long auditId, CreateActionPlanRequest request,
                                         Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditActionPlan plan = new AuditActionPlan();
        plan.setAuditId(auditId);
        plan.setFindingId(request.findingId());
        plan.setActionType(ActionPlanType.valueOf(request.actionType()));
        plan.setDescription(request.description());
        plan.setRootCauseAnalysis(request.rootCauseAnalysis());
        plan.setActionOwnerId(request.actionOwnerId());
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            plan.setDueDate(LocalDate.parse(request.dueDate()));
        }
        plan.setPriority(request.priority());
        plan.setStatus(ActionPlanStatus.NOT_STARTED);
        if (request.effectivenessCheckRequired() != null) {
            plan.setEffectivenessCheckRequired(request.effectivenessCheckRequired());
        }
        plan.setComments(request.comments());
        plan = actionPlanRepository.save(plan);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "action_plan", null,
                request.actionType(), "Action plan added", actorId, actorName, ip, ua);
        return plan;
    }

    @Transactional
    public AuditActionPlan updateActionPlan(Long auditId, Long actionId, UpdateActionPlanRequest request,
                                             Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditActionPlan plan = actionPlanRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action plan not found: " + actionId));
        if (!plan.getAuditId().equals(auditId)) {
            throw new WorkflowException("Action plan " + actionId + " does not belong to audit " + auditId);
        }
        if (request.actionType() != null) plan.setActionType(ActionPlanType.valueOf(request.actionType()));
        if (request.description() != null) plan.setDescription(request.description());
        if (request.rootCauseAnalysis() != null) plan.setRootCauseAnalysis(request.rootCauseAnalysis());
        if (request.actionOwnerId() != null) plan.setActionOwnerId(request.actionOwnerId());
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            plan.setDueDate(LocalDate.parse(request.dueDate()));
        }
        if (request.priority() != null) plan.setPriority(request.priority());
        if (request.status() != null) plan.setStatus(ActionPlanStatus.valueOf(request.status()));
        if (request.completionEvidence() != null) plan.setCompletionEvidence(request.completionEvidence());
        if (request.completedById() != null) plan.setCompletedById(request.completedById());
        if (request.completionDate() != null && !request.completionDate().isBlank()) {
            plan.setCompletionDate(LocalDate.parse(request.completionDate()));
        }
        if (request.verifiedById() != null) plan.setVerifiedById(request.verifiedById());
        if (request.verificationDate() != null && !request.verificationDate().isBlank()) {
            plan.setVerificationDate(LocalDate.parse(request.verificationDate()));
        }
        if (request.effectivenessCheckRequired() != null) plan.setEffectivenessCheckRequired(request.effectivenessCheckRequired());
        if (request.effectivenessCheckDate() != null && !request.effectivenessCheckDate().isBlank()) {
            plan.setEffectivenessCheckDate(LocalDate.parse(request.effectivenessCheckDate()));
        }
        if (request.effectivenessResult() != null) plan.setEffectivenessResult(EffectivenessResult.valueOf(request.effectivenessResult()));
        if (request.comments() != null) plan.setComments(request.comments());
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "action_plan." + actionId,
                null, "updated", "Action plan updated", actorId, actorName, ip, ua);
        return plan;
    }

    // --- meetings --------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditMeeting> getMeetings(Long auditId) {
        require(auditId);
        return meetingRepository.findByAuditIdOrderByMeetingDateTimeAsc(auditId);
    }

    @Transactional
    public AuditMeeting addMeeting(Long auditId, CreateMeetingRequest request,
                                   Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditMeeting meeting = new AuditMeeting();
        meeting.setAuditId(auditId);
        meeting.setMeetingType(MeetingType.valueOf(request.meetingType()));
        meeting.setMeetingDateTime(request.meetingDateTime());
        meeting.setAttendees(request.attendees());
        meeting.setAgenda(request.agenda());
        meeting.setDiscussionSummary(request.discussionSummary());
        meeting.setKeyDecisions(request.keyDecisions());
        meeting.setAgreedActions(request.agreedActions());
        meeting = meetingRepository.save(meeting);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "meeting", null,
                request.meetingType(), "Meeting added", actorId, actorName, ip, ua);
        return meeting;
    }

    @Transactional
    public AuditMeeting updateMeeting(Long auditId, Long meetingId, UpdateMeetingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + meetingId));
        if (!meeting.getAuditId().equals(auditId)) {
            throw new WorkflowException("Meeting " + meetingId + " does not belong to audit " + auditId);
        }
        if (request.meetingType() != null) meeting.setMeetingType(MeetingType.valueOf(request.meetingType()));
        if (request.meetingDateTime() != null) meeting.setMeetingDateTime(request.meetingDateTime());
        if (request.attendees() != null) meeting.setAttendees(request.attendees());
        if (request.agenda() != null) meeting.setAgenda(request.agenda());
        if (request.discussionSummary() != null) meeting.setDiscussionSummary(request.discussionSummary());
        if (request.keyDecisions() != null) meeting.setKeyDecisions(request.keyDecisions());
        if (request.agreedActions() != null) meeting.setAgreedActions(request.agreedActions());
        if (request.minutesApproved() != null) meeting.setMinutesApproved(request.minutesApproved());
        if (request.approvedById() != null) meeting.setApprovedById(request.approvedById());
        if (request.approvalDate() != null) meeting.setApprovalDate(request.approvalDate());
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "meeting." + meetingId,
                null, "updated", "Meeting updated", actorId, actorName, ip, ua);
        return meeting;
    }

    // --- linked records --------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<AuditLinkedRecord> getLinkedRecords(Long auditId) {
        require(auditId);
        return linkedRecordRepository.findByAuditId(auditId);
    }

    @Transactional
    public AuditLinkedRecord addLinkedRecord(Long auditId, CreateLinkedRecordRequest request,
                                              Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditLinkedRecordType type = AuditLinkedRecordType.valueOf(request.recordType());
        if (linkedRecordRepository.existsByAuditIdAndRecordTypeAndRecordId(auditId, type, request.recordId())) {
            throw new WorkflowException("Record " + request.recordType() + "/" + request.recordId()
                    + " is already linked to audit " + auditId);
        }
        AuditLinkedRecord link = new AuditLinkedRecord();
        link.setAuditId(auditId);
        link.setRecordType(type);
        link.setRecordId(request.recordId());
        link.setRecordReference(request.recordReference());
        link.setRecordTitle(request.recordTitle());
        link.setRecordStatus(request.recordStatus());
        link.setNotes(request.notes());
        link = linkedRecordRepository.save(link);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "linked_record", null,
                request.recordType() + "/" + request.recordId(),
                "Record linked to audit", actorId, actorName, ip, ua);
        return link;
    }

    @Transactional
    public void removeLinkedRecord(Long auditId, Long linkId, Long actorId, String actorName, String ip, String ua) {
        Audit audit = require(auditId);
        AuditLinkedRecord link = linkedRecordRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("Linked record not found: " + linkId));
        if (!link.getAuditId().equals(auditId)) {
            throw new WorkflowException("Linked record " + linkId + " does not belong to audit " + auditId);
        }
        String ref = link.getRecordType().name() + "/" + link.getRecordId();
        linkedRecordRepository.delete(link);
        audit(audit.getAuditNo(), auditId, AuditAction.UPDATE, "linked_record",
                ref, "removed", "Record link removed", actorId, actorName, ip, ua);
    }

    // --- internals -------------------------------------------------------------------------------

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

    private AuditFinding requireFinding(Long findingId, Long auditId) {
        AuditFinding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + findingId));
        if (!finding.getAuditId().equals(auditId)) {
            throw new WorkflowException("Finding " + findingId + " does not belong to audit " + auditId);
        }
        return finding;
    }
}
