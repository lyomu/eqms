package com.eqms.complaints;

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
import com.eqms.complaints.dto.CreateCapaFromComplaintRequest;
import com.eqms.complaints.dto.CreateComplaintRequest;
import com.eqms.complaints.dto.UpdateComplaintRequest;
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
 * Complaint Management application service. Status changes go through {@link WorkflowService};
 * acknowledgment and closure signatures through {@link SignatureService}; numbering through
 * {@link SequenceService}. Investigation/resolution detail lives in child tables; a complaint can
 * spawn or link CAPAs via {@link CapaService}.
 */
@Service
public class ComplaintService {

    private static final String COMPLAINT_PREFIX = "COMPL";

    private final ComplaintRepository repository;
    private final ComplaintInvestigationRepository investigationRepository;
    private final ComplaintResolutionRepository resolutionRepository;
    private final ComplaintCapaLinkRepository capaLinkRepository;
    private final ComplaintTimelineRepository timelineRepository;
    private final CapaService capaService;
    private final CapaRepository capaRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public ComplaintService(ComplaintRepository repository,
                            ComplaintInvestigationRepository investigationRepository,
                            ComplaintResolutionRepository resolutionRepository,
                            ComplaintCapaLinkRepository capaLinkRepository,
                            ComplaintTimelineRepository timelineRepository,
                            CapaService capaService, CapaRepository capaRepository,
                            SequenceService sequenceService, WorkflowService workflowService,
                            SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.investigationRepository = investigationRepository;
        this.resolutionRepository = resolutionRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.timelineRepository = timelineRepository;
        this.capaService = capaService;
        this.capaRepository = capaRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Complaint create(CreateComplaintRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(COMPLAINT_PREFIX, year);

        Complaint complaint = new Complaint();
        complaint.setComplaintNo(number);
        complaint.setProductId(request.productId());
        complaint.setComplaintDescription(request.complaintDescription());
        complaint.setSource(request.source());
        complaint.setSeverity(request.severity());
        complaint.setReportedBy(request.reportedBy());
        complaint.setReportedDate(Instant.now(clock));
        complaint.setOwnerId(actorId);
        complaint.setComplaintStatus(ComplaintStatus.OPEN);
        complaint = repository.save(complaint);

        audit(complaint.getId(), AuditAction.CREATE, null, null, number,
                "Complaint created", actorId, actorName, ip, ua);
        addTimeline(complaint.getId(), "Complaint opened",
                request.severity() == ComplaintSeverity.CRITICAL ? "Critical — immediate escalation" : null);
        return complaint;
    }

    @Transactional(readOnly = true)
    public Page<Complaint> list(ComplaintStatus status, ComplaintSource source, ComplaintSeverity severity,
                                Pageable pageable) {
        if (status != null) {
            return repository.findByComplaintStatus(status, pageable);
        }
        if (source != null) {
            return repository.findBySource(source, pageable);
        }
        if (severity != null) {
            return repository.findBySeverity(severity, pageable);
        }
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Complaint get(Long id) {
        return require(id);
    }

    @Transactional(readOnly = true)
    public ComplaintInvestigation getInvestigation(Long complaintId) {
        return investigationRepository.findByComplaintId(complaintId).orElse(null);
    }

    @Transactional(readOnly = true)
    public ComplaintResolution getResolution(Long complaintId) {
        return resolutionRepository.findByComplaintId(complaintId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Long> getLinkedCapaIds(Long complaintId) {
        return capaLinkRepository.findByComplaintId(complaintId).stream()
                .map(ComplaintCapaLink::getCapaId).toList();
    }

    @Transactional
    public Complaint update(Long id, UpdateComplaintRequest request, Long actorId, String actorName,
                            String ip, String ua) {
        Complaint complaint = require(id);
        checkVersion(complaint.getVersion(), request.expectedVersion());
        if (complaint.getComplaintStatus() != ComplaintStatus.OPEN
                && complaint.getComplaintStatus() != ComplaintStatus.ACKNOWLEDGED) {
            throw new WorkflowException("Complaint details can only be edited before investigation begins");
        }
        if (request.complaintDescription() != null) {
            complaint.setComplaintDescription(request.complaintDescription());
        }
        if (request.severity() != null) {
            complaint.setSeverity(request.severity());
        }
        if (request.reportedBy() != null) {
            complaint.setReportedBy(request.reportedBy());
        }
        audit(complaint.getId(), AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Complaint details updated", actorId, actorName, ip, ua);
        return complaint;
    }

    // --- workflow transitions ------------------------------------------------------------------

    @Transactional
    public Complaint acknowledge(Long id, int v, String reason, String password, String totpCode,
                                 boolean firstSignatureInSession, String meaningStatement,
                                 Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(ComplaintWorkflow.RECORD_TYPE).recordId(String.valueOf(complaint.getId()))
                .contentHash(complaint.workflowContentHash())
                .meaning(SignatureMeaning.ACKNOWLEDGED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I acknowledge receipt of this complaint.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        transition(complaint, ComplaintWorkflow.ACKNOWLEDGE, v, reason, actorId, actorName, ip, ua);
        addTimeline(complaint.getId(), "Acknowledged", null);
        return complaint;
    }

    @Transactional
    public Complaint investigate(Long id, int v, String findings, String reason,
                                 Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        if (findings == null || findings.isBlank()) {
            throw new WorkflowException("Investigation findings are required to begin investigation");
        }
        ComplaintInvestigation investigation = investigationRepository.findByComplaintId(id)
                .orElseGet(ComplaintInvestigation::new);
        investigation.setComplaintId(id);
        investigation.setInvestigationFindings(findings);
        investigation.setInvestigatorId(actorId);
        investigation.setInvestigationDate(Instant.now(clock));
        investigationRepository.save(investigation);

        transition(complaint, ComplaintWorkflow.INVESTIGATE, v, reason, actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "investigation_findings", null, "recorded",
                "Investigation findings submitted", actorId, actorName, ip, ua);
        addTimeline(id, "Investigation started", null);
        return complaint;
    }

    @Transactional
    public ComplaintInvestigation recordRootCause(Long id, String rootCause, String method, String reason,
                                                  Long actorId, String actorName, String ip, String ua) {
        require(id);
        ComplaintInvestigation investigation = requireInvestigation(id);
        String previous = investigation.getRootCause();
        investigation.setRootCause(rootCause);
        investigation.setRootCauseMethod(method);
        audit(id, AuditAction.UPDATE, "root_cause", previous, rootCause,
                reason != null ? reason : "Root cause recorded", actorId, actorName, ip, ua);
        return investigation;
    }

    @Transactional
    public ComplaintInvestigation recordImpact(Long id, String impactOnProduct, String reason,
                                               Long actorId, String actorName, String ip, String ua) {
        require(id);
        ComplaintInvestigation investigation = requireInvestigation(id);
        investigation.setImpactOnProduct(impactOnProduct);
        audit(id, AuditAction.UPDATE, "impact_on_product", null, "assessed",
                reason != null ? reason : "Product impact assessed", actorId, actorName, ip, ua);
        return investigation;
    }

    @Transactional
    public Complaint resolve(Long id, int v, String resolutionDescription, String reason,
                             Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        if (resolutionDescription == null || resolutionDescription.isBlank()) {
            throw new WorkflowException("A resolution description is required to resolve a complaint");
        }
        ComplaintResolution resolution = resolutionRepository.findByComplaintId(id)
                .orElseGet(ComplaintResolution::new);
        resolution.setComplaintId(id);
        resolution.setResolutionDescription(resolutionDescription);
        resolution.setResolutionDate(Instant.now(clock));
        resolution.setResolvedBy(actorId);
        resolutionRepository.save(resolution);

        // The resolver becomes the submitter, so a different user must sign off the closure (rule 7).
        complaint.setSubmittedBy(actorId);
        transition(complaint, ComplaintWorkflow.RESOLVE, v, reason, actorId, actorName, ip, ua);
        addTimeline(id, "Resolved", null);
        return complaint;
    }

    @Transactional
    public Complaint close(Long id, int v, String reason, String password, String totpCode,
                           boolean firstSignatureInSession, String meaningStatement,
                           Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(ComplaintWorkflow.RECORD_TYPE).recordId(String.valueOf(complaint.getId()))
                .contentHash(complaint.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I confirm this complaint is fully investigated and resolved, and approve its closure.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        complaint.setClosedDate(Instant.now(clock));
        transition(complaint, ComplaintWorkflow.CLOSE, v, reason, actorId, actorName, ip, ua);
        addTimeline(id, "Closed", null);
        return complaint;
    }

    @Transactional
    public Complaint cancel(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        transition(complaint, ComplaintWorkflow.CANCEL, v, reason, actorId, actorName, ip, ua);
        addTimeline(id, "Cancelled", reason);
        return complaint;
    }

    // --- CAPA linkage --------------------------------------------------------------------------

    @Transactional
    public Capa createCapa(Long id, CreateCapaFromComplaintRequest request,
                           Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        String title = (request.title() != null && !request.title().isBlank())
                ? request.title()
                : "CAPA for complaint " + complaint.getComplaintNo();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.COMPLAINT, request.description(),
                        request.effectivenessCheckRequired(), request.dueDate()),
                actorId, actorName, ip, ua);
        link(complaint.getId(), capa.getId(), actorId, actorName, ip, ua,
                request.reason() != null ? request.reason() : "CAPA created from complaint");
        addTimeline(id, "CAPA created", capa.getCapaNumber());
        return capa;
    }

    @Transactional
    public ComplaintCapaLink linkCapa(Long id, Long capaId, String reason,
                                      Long actorId, String actorName, String ip, String ua) {
        Complaint complaint = require(id);
        capaRepository.findById(capaId)
                .orElseThrow(() -> new ResourceNotFoundException("CAPA not found: " + capaId));
        if (capaLinkRepository.existsByComplaintIdAndCapaId(complaint.getId(), capaId)) {
            return capaLinkRepository.findByComplaintId(complaint.getId()).stream()
                    .filter(l -> l.getCapaId().equals(capaId)).findFirst().orElseThrow();
        }
        ComplaintCapaLink link = link(complaint.getId(), capaId, actorId, actorName, ip, ua,
                reason != null ? reason : "Existing CAPA linked to complaint");
        addTimeline(id, "CAPA linked", String.valueOf(capaId));
        return link;
    }

    @Transactional(readOnly = true)
    public List<ComplaintTimeline> timeline(Long id) {
        require(id);
        return timelineRepository.findByComplaintIdOrderByEventDateAsc(id);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(ComplaintWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals -----------------------------------------------------------------------------

    private ComplaintCapaLink link(Long complaintId, Long capaId, Long actorId, String actorName,
                                   String ip, String ua, String reason) {
        ComplaintCapaLink link = new ComplaintCapaLink();
        link.setComplaintId(complaintId);
        link.setCapaId(capaId);
        link = capaLinkRepository.save(link);
        audit(complaintId, AuditAction.UPDATE, "capa_link", null, String.valueOf(capaId),
                reason, actorId, actorName, ip, ua);
        return link;
    }

    private void addTimeline(Long complaintId, String event, String notes) {
        ComplaintTimeline entry = new ComplaintTimeline();
        entry.setComplaintId(complaintId);
        entry.setEvent(event);
        entry.setEventDate(Instant.now(clock));
        entry.setNotes(notes);
        timelineRepository.save(entry);
    }

    private void transition(Complaint complaint, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(ComplaintWorkflow.DEFINITION, complaint,
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
                .recordType(ComplaintWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private Complaint require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found: " + id));
    }

    private ComplaintInvestigation requireInvestigation(Long complaintId) {
        return investigationRepository.findByComplaintId(complaintId)
                .orElseThrow(() -> new WorkflowException("Investigation has not been started for this complaint"));
    }
}
