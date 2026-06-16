package com.eqms.nonconformance;

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
import com.eqms.capa.Capa;
import com.eqms.capa.CapaRepository;
import com.eqms.capa.CapaService;
import com.eqms.capa.CapaSource;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.nonconformance.dto.CloseNcRequest;
import com.eqms.nonconformance.dto.CreateCapaFromNcRequest;
import com.eqms.nonconformance.dto.CreateNonConformanceRequest;
import com.eqms.nonconformance.dto.DetermineNcDispositionRequest;
import com.eqms.nonconformance.dto.ImplementActionRequest;
import com.eqms.nonconformance.dto.InvestigateNcRequest;
import com.eqms.nonconformance.dto.UpdateNonConformanceRequest;
import com.eqms.nonconformance.dto.UseAsIsApprovalRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

@Service
public class NonConformanceService {

    private static final String NC_PREFIX = "NC";

    private final NonConformanceRepository repository;
    private final NonConformanceInvestigationRepository investigationRepository;
    private final NonConformanceDispositionRepository dispositionRepository;
    private final NonConformanceUseAsIsApprovalRepository useAsIsRepository;
    private final NonConformanceCapaLinkRepository capaLinkRepository;
    private final CapaService capaService;
    private final CapaRepository capaRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public NonConformanceService(NonConformanceRepository repository,
                                 NonConformanceInvestigationRepository investigationRepository,
                                 NonConformanceDispositionRepository dispositionRepository,
                                 NonConformanceUseAsIsApprovalRepository useAsIsRepository,
                                 NonConformanceCapaLinkRepository capaLinkRepository,
                                 CapaService capaService, CapaRepository capaRepository,
                                 SequenceService sequenceService, WorkflowService workflowService,
                                 SignatureService signatureService, AuditService auditService,
                                 Clock utcClock) {
        this.repository = repository;
        this.investigationRepository = investigationRepository;
        this.dispositionRepository = dispositionRepository;
        this.useAsIsRepository = useAsIsRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.capaService = capaService;
        this.capaRepository = capaRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public NonConformance create(CreateNonConformanceRequest request, Long actorId, String actorName,
                                 String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(NC_PREFIX, year);

        NonConformance nc = new NonConformance();
        nc.setNcNo(number);
        nc.setTitle(request.title());
        nc.setDescription(request.description());
        nc.setNcType(request.ncType());
        nc.setAffectedItemId(request.affectedItemId());
        nc.setAffectedItemType(request.affectedItemType());
        nc.setDiscoveredDate(Instant.now(clock));
        nc.setDiscoveredBy(request.discoveredBy() != null ? request.discoveredBy() : actorName);
        nc.setOwnerId(actorId);
        nc.setNcStatus(NcStatus.OPEN);
        nc = repository.save(nc);

        audit(nc.getId(), AuditAction.CREATE, null, null, number,
                "Non-conformance raised; affected item quarantined pending disposition",
                actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional(readOnly = true)
    public Page<NonConformance> list(NcStatus status, NcType type, Pageable pageable) {
        if (status != null) return repository.findByNcStatus(status, pageable);
        if (type != null) return repository.findByNcType(type, pageable);
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public NonConformance get(Long id) {
        return require(id);
    }

    @Transactional
    public NonConformance update(Long id, UpdateNonConformanceRequest request, Long actorId, String actorName,
                                 String ip, String ua) {
        NonConformance nc = require(id);
        checkVersion(nc.getVersion(), request.expectedVersion());
        if (nc.getNcStatus() != NcStatus.OPEN) {
            throw new WorkflowException("Non-conformance details can only be edited while OPEN");
        }
        if (request.title() != null) nc.setTitle(request.title());
        if (request.description() != null) nc.setDescription(request.description());
        if (request.ncType() != null) nc.setNcType(request.ncType());
        if (request.affectedItemType() != null) nc.setAffectedItemType(request.affectedItemType());
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Non-conformance updated", actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional
    public NonConformance investigate(Long id, InvestigateNcRequest request, Long actorId, String actorName,
                                      String ip, String ua) {
        NonConformance nc = require(id);
        if (request.investigationFindings() == null || request.investigationFindings().isBlank()) {
            throw new WorkflowException("Investigation findings are required");
        }

        NonConformanceInvestigation investigation = investigationRepository.findByNcId(id)
                .orElseGet(NonConformanceInvestigation::new);
        investigation.setNcId(id);
        investigation.setInvestigationFindings(request.investigationFindings());
        if (request.rootCause() != null) investigation.setRootCause(request.rootCause());
        investigation.setInvestigatorId(actorId);
        investigation.setInvestigationDate(Instant.now(clock));
        investigationRepository.save(investigation);

        transition(nc, NonConformanceWorkflow.INVESTIGATE, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Investigation started", actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "investigation", null, "recorded",
                "Investigation findings submitted", actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional
    public NonConformanceUseAsIsApproval requestUseAsIsApproval(Long id, UseAsIsApprovalRequest request,
                                                                boolean firstSignatureInSession,
                                                                Long actorId, String actorName, String ip, String ua) {
        NonConformance nc = require(id);
        if (nc.getNcStatus() != NcStatus.INVESTIGATING) {
            throw new WorkflowException("Use As Is approval can only be requested during investigation");
        }

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(NonConformanceWorkflow.RECORD_TYPE).recordId(String.valueOf(nc.getId()))
                .contentHash(nc.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I approve the use-as-is disposition of this non-conforming item based on the documented justification and risk assessment.")
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        NonConformanceUseAsIsApproval approval = useAsIsRepository.findByNcId(id)
                .orElseGet(NonConformanceUseAsIsApproval::new);
        approval.setNcId(id);
        approval.setUseAsIsJustification(request.useAsIsJustification());
        approval.setRiskAssessment(request.riskAssessment());
        approval.setApprovedBy(actorId);
        approval.setApprovedDate(Instant.now(clock));
        approval = useAsIsRepository.save(approval);

        audit(id, AuditAction.UPDATE, "use_as_is_approval", null, "approved",
                request.reason() != null ? request.reason() : "Use As Is special approval granted",
                actorId, actorName, ip, ua);
        return approval;
    }

    @Transactional
    public NonConformance determineDisposition(Long id, DetermineNcDispositionRequest request,
                                               boolean firstSignatureInSession,
                                               Long actorId, String actorName, String ip, String ua) {
        NonConformance nc = require(id);

        if (request.disposition() == NcDisposition.USE_AS_IS
                && useAsIsRepository.findByNcId(id).isEmpty()) {
            throw new WorkflowException("A Use As Is disposition requires a special approval to be recorded first "
                    + "(POST /request-approval)");
        }
        if (request.disposition() == NcDisposition.REWORK
                && (request.reworkSpecifications() == null || request.reworkSpecifications().isBlank())) {
            throw new WorkflowException("Rework disposition requires rework specifications to be defined");
        }

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(NonConformanceWorkflow.RECORD_TYPE).recordId(String.valueOf(nc.getId()))
                .contentHash(nc.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I approve the disposition of this non-conformance: " + request.disposition().name())
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        NonConformanceDisposition disposition = dispositionRepository.findByNcId(id)
                .orElseGet(NonConformanceDisposition::new);
        disposition.setNcId(id);
        disposition.setDisposition(request.disposition());
        disposition.setRationale(request.rationale());
        disposition.setReworkSpecifications(request.reworkSpecifications());
        if (disposition.getReworkCompleted() == null) disposition.setReworkCompleted(false);
        disposition.setApprovedBy(actorId);
        disposition.setApprovedDate(Instant.now(clock));
        dispositionRepository.save(disposition);

        // Disposition approval makes the actor the submitter, so a different user must close (rule 7).
        nc.setSubmittedBy(actorId);
        transition(nc, NonConformanceWorkflow.DETERMINE_DISPOSITION, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Disposition approved: " + request.disposition(),
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "disposition", null, request.disposition().name(),
                "Disposition determined: " + request.disposition(), actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional
    public NonConformance implementAction(Long id, ImplementActionRequest request, Long actorId, String actorName,
                                          String ip, String ua) {
        NonConformance nc = require(id);

        NonConformanceDisposition disposition = dispositionRepository.findByNcId(id)
                .orElseThrow(() -> new WorkflowException("No disposition has been approved for this non-conformance"));

        if (disposition.getDisposition() == NcDisposition.REWORK && !request.reworkCompleted()) {
            throw new WorkflowException("Rework disposition requires rework completion to be verified");
        }
        if (request.reworkCompleted()) {
            disposition.setReworkCompleted(true);
            dispositionRepository.save(disposition);
        }

        transition(nc, NonConformanceWorkflow.IMPLEMENT_ACTION, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Corrective action implemented",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "corrective_action", null, "implemented",
                "Corrective action recorded as implemented", actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional
    public Capa createCapa(Long id, CreateCapaFromNcRequest request, Long actorId, String actorName,
                           String ip, String ua) {
        NonConformance nc = require(id);
        String title = (request.title() != null && !request.title().isBlank())
                ? request.title()
                : "CAPA for non-conformance " + nc.getNcNo();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.INTERNAL, request.description(),
                        request.effectivenessCheckRequired(), request.dueDate(),
                        null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null),
                actorId, actorName, ip, ua);

        if (!capaLinkRepository.existsByNcIdAndCapaId(id, capa.getId())) {
            NonConformanceCapaLink link = new NonConformanceCapaLink();
            link.setNcId(id);
            link.setCapaId(capa.getId());
            capaLinkRepository.save(link);
        }

        audit(id, AuditAction.UPDATE, "capa_link", null, String.valueOf(capa.getId()),
                request.reason() != null ? request.reason() : "CAPA created from non-conformance",
                actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public NonConformance close(Long id, CloseNcRequest request, boolean firstSignatureInSession,
                                Long actorId, String actorName, String ip, String ua) {
        NonConformance nc = require(id);

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(NonConformanceWorkflow.RECORD_TYPE).recordId(String.valueOf(nc.getId()))
                .contentHash(nc.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I confirm this non-conformance is fully resolved and approve its closure.")
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        nc.setClosedDate(Instant.now(clock));
        transition(nc, NonConformanceWorkflow.CLOSE, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        return nc;
    }

    @Transactional(readOnly = true)
    public NonConformanceInvestigation getInvestigation(Long ncId) {
        return investigationRepository.findByNcId(ncId).orElse(null);
    }

    @Transactional(readOnly = true)
    public NonConformanceDisposition getDisposition(Long ncId) {
        return dispositionRepository.findByNcId(ncId).orElse(null);
    }

    @Transactional(readOnly = true)
    public NonConformanceUseAsIsApproval getUseAsIsApproval(Long ncId) {
        return useAsIsRepository.findByNcId(ncId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Long> getLinkedCapaIds(Long ncId) {
        return capaLinkRepository.findByNcId(ncId).stream().map(NonConformanceCapaLink::getCapaId).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(NonConformanceWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals ---------------------------------------------------------------------------

    private void transition(NonConformance nc, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(NonConformanceWorkflow.DEFINITION, nc,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(ua)
                        .build());
    }

    private void audit(Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(NonConformanceWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private NonConformance require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Non-conformance not found: " + id));
    }
}
