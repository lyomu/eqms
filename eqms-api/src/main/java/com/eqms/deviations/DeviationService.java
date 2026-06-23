package com.eqms.deviations;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.deviations.dto.CreateContainmentActionRequest;
import com.eqms.deviations.dto.CreateDeviationRequest;
import com.eqms.deviations.dto.CreateLinkedRecordRequest;
import com.eqms.deviations.dto.UpdateContainmentActionRequest;
import com.eqms.deviations.dto.UpdateDeviationDetailsRequest;
import com.eqms.deviations.dto.UpsertImpactAssessmentRequest;
import com.eqms.deviations.dto.UpsertInvestigationRequest;
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
 * Deviation application service. Status changes via {@link WorkflowService}, the approval signature
 * via {@link SignatureService}, numbering via {@link SequenceService}. The root-cause edit is
 * version-checked and audited here.
 */
@Service
public class DeviationService {

    private static final String DEV_PREFIX = "DEV";

    private final DeviationRepository repository;
    private final ContainmentActionRepository containmentActionRepository;
    private final ImpactAssessmentRepository impactAssessmentRepository;
    private final InvestigationRepository investigationRepository;
    private final LinkedRecordRepository linkedRecordRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public DeviationService(DeviationRepository repository,
                            ContainmentActionRepository containmentActionRepository,
                            ImpactAssessmentRepository impactAssessmentRepository,
                            InvestigationRepository investigationRepository,
                            LinkedRecordRepository linkedRecordRepository,
                            SequenceService sequenceService,
                            WorkflowService workflowService,
                            SignatureService signatureService,
                            AuditService auditService,
                            Clock utcClock) {
        this.repository = repository;
        this.containmentActionRepository = containmentActionRepository;
        this.impactAssessmentRepository = impactAssessmentRepository;
        this.investigationRepository = investigationRepository;
        this.linkedRecordRepository = linkedRecordRepository;
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

        // Extended fields
        if (request.deviationType() != null) deviation.setDeviationType(request.deviationType());
        if (request.category() != null) deviation.setCategory(request.category());
        if (request.relatedModule() != null) deviation.setRelatedModule(request.relatedModule());
        if (request.department() != null) deviation.setDepartment(request.department());
        if (request.site() != null) deviation.setSite(request.site());
        if (request.location() != null) deviation.setLocation(request.location());
        if (request.dateDiscovered() != null) deviation.setDateDiscovered(request.dateDiscovered());
        deviation.setDateReported(Instant.now(clock));
        if (request.reportedById() != null) deviation.setReportedById(request.reportedById());
        if (request.ownerId() != null) deviation.setOwnerId(request.ownerId());
        if (request.qaOwnerId() != null) deviation.setQaOwnerId(request.qaOwnerId());
        if (request.initialRiskLevel() != null) deviation.setInitialRiskLevel(request.initialRiskLevel());
        if (request.whatHappened() != null) deviation.setWhatHappened(request.whatHappened());
        if (request.whereHappened() != null) deviation.setWhereHappened(request.whereHappened());
        if (request.howDetected() != null) deviation.setHowDetected(request.howDetected());
        if (request.whoInvolved() != null) deviation.setWhoInvolved(request.whoInvolved());
        if (request.productAffected() != null) deviation.setProductAffected(request.productAffected());
        if (request.materialAffected() != null) deviation.setMaterialAffected(request.materialAffected());
        if (request.batchAffected() != null) deviation.setBatchAffected(request.batchAffected());
        if (request.equipmentAffected() != null) deviation.setEquipmentAffected(request.equipmentAffected());
        if (request.supplierInvolved() != null) deviation.setSupplierInvolved(request.supplierInvolved());
        if (request.customerImpactPossible() != null) deviation.setCustomerImpactPossible(request.customerImpactPossible());
        if (request.regulatoryImpactPossible() != null) deviation.setRegulatoryImpactPossible(request.regulatoryImpactPossible());
        if (request.dataIntegrityImpactPossible() != null) deviation.setDataIntegrityImpactPossible(request.dataIntegrityImpactPossible());
        if (request.containmentRequired() != null) deviation.setContainmentRequired(request.containmentRequired());
        if (request.investigationRequired() != null) deviation.setInvestigationRequired(request.investigationRequired());
        if (request.capaRequired() != null) deviation.setCapaRequired(request.capaRequired());
        if (request.changeControlRequired() != null) deviation.setChangeControlRequired(request.changeControlRequired());
        if (request.targetInvestigationDueDate() != null) deviation.setTargetInvestigationDueDate(request.targetInvestigationDueDate());
        if (request.targetClosureDueDate() != null) deviation.setTargetClosureDueDate(request.targetClosureDueDate());

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
    public Deviation updateDetails(Long id, UpdateDeviationDetailsRequest req,
                                   Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        checkVersion(deviation.getVersion(), req.expectedVersion());

        if (req.title() != null && !req.title().isBlank()) deviation.setTitle(req.title());
        if (req.description() != null) deviation.setDescription(req.description());
        if (req.deviationType() != null) deviation.setDeviationType(req.deviationType());
        if (req.category() != null) deviation.setCategory(req.category());
        if (req.relatedModule() != null) deviation.setRelatedModule(req.relatedModule());
        if (req.department() != null) deviation.setDepartment(req.department());
        if (req.site() != null) deviation.setSite(req.site());
        if (req.location() != null) deviation.setLocation(req.location());
        if (req.dateDiscovered() != null) deviation.setDateDiscovered(req.dateDiscovered());
        if (req.dateReported() != null) deviation.setDateReported(req.dateReported());
        if (req.reportedById() != null) deviation.setReportedById(req.reportedById());
        if (req.ownerId() != null) deviation.setOwnerId(req.ownerId());
        if (req.qaOwnerId() != null) deviation.setQaOwnerId(req.qaOwnerId());
        if (req.severity() != null) deviation.setSeverity(req.severity());
        if (req.initialRiskLevel() != null) deviation.setInitialRiskLevel(req.initialRiskLevel());
        if (req.whatHappened() != null) deviation.setWhatHappened(req.whatHappened());
        if (req.whereHappened() != null) deviation.setWhereHappened(req.whereHappened());
        if (req.howDetected() != null) deviation.setHowDetected(req.howDetected());
        if (req.whoInvolved() != null) deviation.setWhoInvolved(req.whoInvolved());
        if (req.immediateAction() != null) deviation.setImmediateAction(req.immediateAction());
        if (req.productAffected() != null) deviation.setProductAffected(req.productAffected());
        if (req.materialAffected() != null) deviation.setMaterialAffected(req.materialAffected());
        if (req.batchAffected() != null) deviation.setBatchAffected(req.batchAffected());
        if (req.equipmentAffected() != null) deviation.setEquipmentAffected(req.equipmentAffected());
        if (req.supplierInvolved() != null) deviation.setSupplierInvolved(req.supplierInvolved());
        if (req.customerImpactPossible() != null) deviation.setCustomerImpactPossible(req.customerImpactPossible());
        if (req.regulatoryImpactPossible() != null) deviation.setRegulatoryImpactPossible(req.regulatoryImpactPossible());
        if (req.dataIntegrityImpactPossible() != null) deviation.setDataIntegrityImpactPossible(req.dataIntegrityImpactPossible());
        if (req.containmentRequired() != null) deviation.setContainmentRequired(req.containmentRequired());
        if (req.investigationRequired() != null) deviation.setInvestigationRequired(req.investigationRequired());
        if (req.capaRequired() != null) deviation.setCapaRequired(req.capaRequired());
        if (req.changeControlRequired() != null) deviation.setChangeControlRequired(req.changeControlRequired());
        if (req.targetInvestigationDueDate() != null) deviation.setTargetInvestigationDueDate(req.targetInvestigationDueDate());
        if (req.targetClosureDueDate() != null) deviation.setTargetClosureDueDate(req.targetClosureDueDate());

        audit(deviation.getId(), AuditAction.UPDATE, "details", null, deviation.getTitle(),
                req.reason() != null ? req.reason() : "Deviation details updated",
                actorId, actorName, ip, ua);
        return deviation;
    }

    @Transactional
    public Deviation reopen(Long id, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        Deviation deviation = require(id);
        checkVersion(deviation.getVersion(), expectedVersion);
        String previousStatus = deviation.getDeviationStatus().name();
        deviation.setDeviationStatus(DeviationStatus.REOPENED);
        deviation.setReopenedAt(Instant.now(clock));
        deviation.setReopenedById(actorId);
        deviation.setReopenReason(reason);
        audit(deviation.getId(), AuditAction.STATUS_CHANGE, "status", previousStatus,
                DeviationStatus.REOPENED.name(), reason, actorId, actorName, ip, ua);
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

    // --- Containment actions ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ContainmentAction> listContainmentActions(Long deviationId) {
        require(deviationId);
        return containmentActionRepository.findByDeviationIdAndDeletedAtIsNull(deviationId);
    }

    @Transactional
    public ContainmentAction addContainmentAction(Long deviationId, CreateContainmentActionRequest req,
                                                  Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        ContainmentAction action = new ContainmentAction();
        action.setDeviationId(deviationId);
        action.setDescription(req.description());
        action.setActionType(req.actionType() != null ? req.actionType() : ContainmentActionType.CONTAINMENT);
        action.setOwnerId(req.ownerId());
        action.setDueDate(req.dueDate());
        action.setStatus(ContainmentActionStatus.NOT_STARTED);
        action.setComments(req.comments());
        action = containmentActionRepository.save(action);

        auditService.record(AuditEntryRequest.builder()
                .recordType("ContainmentAction").recordId(String.valueOf(action.getId()))
                .action(AuditAction.CREATE)
                .newValue(action.getActionType().name() + " for Deviation " + deviationId)
                .reasonForChange("Containment action added")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
        return action;
    }

    @Transactional
    public ContainmentAction updateContainmentAction(Long deviationId, Long actionId,
                                                     UpdateContainmentActionRequest req,
                                                     Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        ContainmentAction action = containmentActionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Containment action not found: " + actionId));
        if (!deviationId.equals(action.getDeviationId())) {
            throw new ResourceNotFoundException("Containment action " + actionId + " does not belong to deviation " + deviationId);
        }

        if (req.status() != null) action.setStatus(req.status());
        if (req.completionEvidence() != null) action.setCompletionEvidence(req.completionEvidence());
        if (req.verifiedById() != null) action.setVerifiedById(req.verifiedById());
        if (req.comments() != null) action.setComments(req.comments());

        if (req.status() == ContainmentActionStatus.COMPLETED && action.getCompletionDate() == null) {
            action.setCompletionDate(Instant.now(clock));
        }

        auditService.record(AuditEntryRequest.builder()
                .recordType("ContainmentAction").recordId(String.valueOf(action.getId()))
                .action(AuditAction.UPDATE)
                .fieldName("status").newValue(req.status() != null ? req.status().name() : null)
                .reasonForChange("Containment action updated")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
        return action;
    }

    // --- Impact assessment -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Optional<DeviationImpactAssessment> getImpactAssessment(Long deviationId) {
        require(deviationId);
        return impactAssessmentRepository.findByDeviationId(deviationId);
    }

    @Transactional
    public DeviationImpactAssessment upsertImpactAssessment(Long deviationId, UpsertImpactAssessmentRequest req,
                                                             Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        Instant now = Instant.now(clock);
        DeviationImpactAssessment assessment = impactAssessmentRepository.findByDeviationId(deviationId)
                .orElseGet(() -> {
                    DeviationImpactAssessment a = new DeviationImpactAssessment();
                    a.setDeviationId(deviationId);
                    a.setCreatedBy(actorId);
                    a.setCreatedAt(now);
                    a.setAssessmentStatus(ImpactAssessmentStatus.NOT_STARTED);
                    return a;
                });

        // Quality
        if (req.productQualityAffected() != null) assessment.setProductQualityAffected(req.productQualityAffected());
        if (req.materialQualityAffected() != null) assessment.setMaterialQualityAffected(req.materialQualityAffected());
        if (req.processQualityAffected() != null) assessment.setProcessQualityAffected(req.processQualityAffected());
        if (req.specificationImpact() != null) assessment.setSpecificationImpact(req.specificationImpact());
        if (req.batchLotImpact() != null) assessment.setBatchLotImpact(req.batchLotImpact());
        if (req.qualityComments() != null) assessment.setQualityComments(req.qualityComments());
        // Safety
        if (req.customerImpact() != null) assessment.setCustomerImpact(req.customerImpact());
        if (req.patientSafetyImpact() != null) assessment.setPatientSafetyImpact(req.patientSafetyImpact());
        if (req.complaintRisk() != null) assessment.setComplaintRisk(req.complaintRisk());
        if (req.recallRisk() != null) assessment.setRecallRisk(req.recallRisk());
        if (req.safetyComments() != null) assessment.setSafetyComments(req.safetyComments());
        // Regulatory
        if (req.regulatoryImpact() != null) assessment.setRegulatoryImpact(req.regulatoryImpact());
        if (req.reportableEvent() != null) assessment.setReportableEvent(req.reportableEvent());
        if (req.inspectionAuditImpact() != null) assessment.setInspectionAuditImpact(req.inspectionAuditImpact());
        if (req.complianceComments() != null) assessment.setComplianceComments(req.complianceComments());
        // Data integrity
        if (req.originalRecordAffected() != null) assessment.setOriginalRecordAffected(req.originalRecordAffected());
        if (req.missingIncompleteData() != null) assessment.setMissingIncompleteData(req.missingIncompleteData());
        if (req.unauthorizedChange() != null) assessment.setUnauthorizedChange(req.unauthorizedChange());
        if (req.traceabilityAffected() != null) assessment.setTraceabilityAffected(req.traceabilityAffected());
        if (req.dataIntegrityComments() != null) assessment.setDataIntegrityComments(req.dataIntegrityComments());
        // Overall
        if (req.overallImpact() != null) assessment.setOverallImpact(req.overallImpact());
        if (req.assessmentStatus() != null) assessment.setAssessmentStatus(req.assessmentStatus());
        if (req.assessedById() != null) assessment.setAssessedById(req.assessedById());
        if (req.assessmentDate() != null) assessment.setAssessmentDate(req.assessmentDate());
        if (req.conclusion() != null) assessment.setConclusion(req.conclusion());
        assessment.setUpdatedAt(now);

        assessment = impactAssessmentRepository.save(assessment);

        auditService.record(AuditEntryRequest.builder()
                .recordType("DeviationImpactAssessment").recordId(String.valueOf(assessment.getId()))
                .action(AuditAction.UPDATE)
                .fieldName("assessment_status")
                .newValue(assessment.getAssessmentStatus().name())
                .reasonForChange("Impact assessment updated")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
        return assessment;
    }

    // --- Investigation ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Optional<DeviationInvestigation> getInvestigation(Long deviationId) {
        require(deviationId);
        return investigationRepository.findByDeviationId(deviationId);
    }

    @Transactional
    public DeviationInvestigation upsertInvestigation(Long deviationId, UpsertInvestigationRequest req,
                                                       Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        Instant now = Instant.now(clock);
        DeviationInvestigation investigation = investigationRepository.findByDeviationId(deviationId)
                .orElseGet(() -> {
                    DeviationInvestigation i = new DeviationInvestigation();
                    i.setDeviationId(deviationId);
                    i.setCreatedBy(actorId);
                    i.setCreatedAt(now);
                    i.setStatus(InvestigationStatus.NOT_STARTED);
                    i.setRootCauseConfirmed(false);
                    return i;
                });

        if (req.status() != null) investigation.setStatus(req.status());
        if (req.investigationOwnerId() != null) investigation.setInvestigationOwnerId(req.investigationOwnerId());
        if (req.startDate() != null) investigation.setStartDate(req.startDate());
        if (req.dueDate() != null) investigation.setDueDate(req.dueDate());
        if (req.completionDate() != null) investigation.setCompletionDate(req.completionDate());
        if (req.summary() != null) investigation.setSummary(req.summary());
        if (req.evidenceReviewed() != null) investigation.setEvidenceReviewed(req.evidenceReviewed());
        if (req.rootCauseCategory() != null) investigation.setRootCauseCategory(req.rootCauseCategory());
        if (req.rootCauseDescription() != null) investigation.setRootCauseDescription(req.rootCauseDescription());
        if (req.contributingFactors() != null) investigation.setContributingFactors(req.contributingFactors());
        if (req.mostProbableRootCause() != null) investigation.setMostProbableRootCause(req.mostProbableRootCause());
        if (req.rootCauseConfirmed() != null) investigation.setRootCauseConfirmed(req.rootCauseConfirmed());
        if (req.analysisMethod() != null) investigation.setAnalysisMethod(req.analysisMethod());
        if (req.investigationConclusion() != null) investigation.setInvestigationConclusion(req.investigationConclusion());
        investigation.setUpdatedAt(now);

        investigation = investigationRepository.save(investigation);

        auditService.record(AuditEntryRequest.builder()
                .recordType("DeviationInvestigation").recordId(String.valueOf(investigation.getId()))
                .action(AuditAction.UPDATE)
                .fieldName("status")
                .newValue(investigation.getStatus().name())
                .reasonForChange("Investigation updated")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
        return investigation;
    }

    // --- Linked records --------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<DeviationLinkedRecord> listLinkedRecords(Long deviationId) {
        require(deviationId);
        return linkedRecordRepository.findByDeviationId(deviationId);
    }

    @Transactional
    public DeviationLinkedRecord addLinkedRecord(Long deviationId, CreateLinkedRecordRequest req,
                                                  Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        if (linkedRecordRepository.existsByDeviationIdAndLinkedRecordTypeAndLinkedRecordId(
                deviationId, req.linkedRecordType(), req.linkedRecordId())) {
            throw new WorkflowException("Record " + req.linkedRecordType() + " #" + req.linkedRecordId()
                    + " is already linked to this deviation");
        }

        DeviationLinkedRecord link = new DeviationLinkedRecord();
        link.setDeviationId(deviationId);
        link.setLinkedRecordType(req.linkedRecordType());
        link.setLinkedRecordId(req.linkedRecordId());
        link.setLinkedRecordNumber(req.linkedRecordNumber());
        link.setNotes(req.notes());
        link.setCreatedBy(actorId);
        link.setCreatedAt(Instant.now(clock));
        link = linkedRecordRepository.save(link);

        auditService.record(AuditEntryRequest.builder()
                .recordType(DeviationWorkflow.RECORD_TYPE).recordId(String.valueOf(deviationId))
                .action(AuditAction.UPDATE)
                .fieldName("linked_records")
                .newValue(req.linkedRecordType() + " #" + req.linkedRecordId())
                .reasonForChange("Linked record added")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
        return link;
    }

    @Transactional
    public void removeLinkedRecord(Long deviationId, Long linkId,
                                   Long actorId, String actorName, String ip, String ua) {
        require(deviationId);
        DeviationLinkedRecord link = linkedRecordRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("Linked record not found: " + linkId));
        if (!deviationId.equals(link.getDeviationId())) {
            throw new ResourceNotFoundException("Linked record " + linkId + " does not belong to deviation " + deviationId);
        }
        String removed = link.getLinkedRecordType() + " #" + link.getLinkedRecordId();
        linkedRecordRepository.delete(link);

        auditService.record(AuditEntryRequest.builder()
                .recordType(DeviationWorkflow.RECORD_TYPE).recordId(String.valueOf(deviationId))
                .action(AuditAction.UPDATE)
                .fieldName("linked_records")
                .oldValue(removed)
                .newValue(null)
                .reasonForChange("Linked record removed")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
    }

    // --- internals -------------------------------------------------------------------------

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
