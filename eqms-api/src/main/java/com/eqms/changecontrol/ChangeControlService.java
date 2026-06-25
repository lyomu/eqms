package com.eqms.changecontrol;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.admin.settings.OrganizationSettingsPolicyService;
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
import com.eqms.workflows.WorkflowException;
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
    private final OrganizationSettingsPolicyService settingsPolicy;
    private final Clock clock;

    public ChangeControlService(ChangeControlRepository repository, SequenceService sequenceService,
                                WorkflowService workflowService, SignatureService signatureService,
                                AuditService auditService, OrganizationSettingsPolicyService settingsPolicy,
                                Clock utcClock) {
        this.repository = repository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.settingsPolicy = settingsPolicy;
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
        cc.setLocationName(normalizeOptional(request.locationName()));
        cc.setPurposeOfChange(normalizeOptional(request.purposeOfChange()));
        cc.setRegulatoryMandateEffectiveDate(request.regulatoryMandateEffectiveDate());
        cc.setRegulatoryMandateSource(normalizeOptional(request.regulatoryMandateSource()));
        cc.setChangeCategory(normalizeOptional(request.changeCategory()));
        cc.setRelatedMarket(normalizeOptional(request.relatedMarket()));
        cc.setRelatedCustomer(normalizeOptional(request.relatedCustomer()));
        cc.setVendorCode(normalizeOptional(request.vendorCode()));
        cc.setVendorName(normalizeOptional(request.vendorName()));
        cc.setProductItemCode(normalizeOptional(request.productItemCode()));
        cc.setProductItemDescription(normalizeOptional(request.productItemDescription()));
        cc.setEquipmentIdNumber(normalizeOptional(request.equipmentIdNumber()));
        cc.setEquipmentName(normalizeOptional(request.equipmentName()));
        cc.setDocumentName(normalizeOptional(request.documentName()));
        cc.setDocumentNumber(normalizeOptional(request.documentNumber()));
        cc.setCurrentStatusBrief(normalizeOptional(request.currentStatusBrief()));
        cc.setProposedChangeBrief(normalizeOptional(request.proposedChangeBrief()));
        cc.setJustification(normalizeOptional(request.justification()));
        cc.setChangeNature(normalizeOptional(request.changeNature()));
        cc.setTemporaryChangePeriod(normalizeOptional(request.temporaryChangePeriod()));
        cc.setEffectivenessCheckRequired(request.effectivenessCheckRequired());
        cc.setTargetImplementationDate(request.targetImplementationDate());
        cc.setChangeOwner(normalizeOptional(request.changeOwner()));
        cc.setChangeOwnerHod(normalizeOptional(request.changeOwnerHod()));
        cc.setQaResponsible(normalizeOptional(request.qaResponsible()));
        addDepartments(cc, request.involvedDepartments());
        addImpactTasks(cc, request.impactTasks());
        cc.setRadAssessmentRequired(normalizeOptional(request.radAssessmentRequired()));
        cc.setCustomerCgAssessmentRequired(normalizeOptional(request.customerCgAssessmentRequired()));
        cc.setCustomerCgComments(normalizeOptional(request.customerCgComments()));
        cc.setQaAssessmentBy(normalizeOptional(request.qaAssessmentBy()));
        cc.setQaAssessmentOn(request.qaAssessmentOn());
        cc.setInternalCustomer(normalizeOptional(request.internalCustomer()));
        cc.setChangeAcceptance(normalizeOptional(request.changeAcceptance()));
        cc.setQaComment(normalizeOptional(request.qaComment()));
        cc.setRecommendations(normalizeOptional(request.recommendations()));
        cc.setQpComments(normalizeOptional(request.qpComments()));
        cc.setVariationClassification(normalizeOptional(request.variationClassification()));
        cc.setDocumentsRequestedForFiling(normalizeOptional(request.documentsRequestedForFiling()));
        cc.setRecommendationForRelease(normalizeOptional(request.recommendationForRelease()));
        cc.setOtherRecommendations(normalizeOptional(request.otherRecommendations()));
        cc.setRadAssessment(normalizeOptional(request.radAssessment()));
        cc.setOtherDepartmentsReview(normalizeOptional(request.otherDepartmentsReview()));
        cc.setFinalQaDecision(normalizeOptional(request.finalQaDecision()));
        cc.setQaReviewDate(request.qaReviewDate());
        cc.setQaReviewer(normalizeOptional(request.qaReviewer()));
        cc.setImplementationDetails(normalizeOptional(request.implementationDetails()));
        cc.setImplementationReview(normalizeOptional(request.implementationReview()));
        cc.setActionConfirmationComment(normalizeOptional(request.actionConfirmationComment()));
        cc.setChangeEffectiveDate(request.changeEffectiveDate());
        cc.setClosureRemarks(normalizeOptional(request.closureRemarks()));
        cc.setBatchArNumber(normalizeOptional(request.batchArNumber()));
        cc.setProductMaterialCode(normalizeOptional(request.productMaterialCode()));
        cc.setProductMaterialName(normalizeOptional(request.productMaterialName()));
        cc.setClosedByName(normalizeOptional(request.closedByName()));
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
        requireImpactAssessment(cc);
        transition(cc, ChangeControlWorkflow.SUBMIT_FOR_REVIEW, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl requestChanges(Long id, int expectedVersion, String reason,
                                        Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.REQUEST_CHANGES, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl resubmitForReview(Long id, int expectedVersion, String reason,
                                           Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        transition(cc, ChangeControlWorkflow.RESUBMIT_FOR_REVIEW, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return cc;
    }

    @Transactional
    public ChangeControl submitForApproval(Long id, int expectedVersion, String reason,
                                           Long actorId, String actorName, String ip, String userAgent) {
        ChangeControl cc = require(id);
        requireImpactAssessment(cc);
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
        if (settingsPolicy.enabled("change-control", "implementationEvidenceRequired", true)
                && isBlank(cc.getImplementationDetails()) && isBlank(cc.getActionConfirmationComment())) {
            throw new WorkflowException("Implementation evidence is required before completing change implementation");
        }
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
        if (settingsPolicy.enabled("change-control", "effectivenessReviewRequired", true)
                && cc.isEffectivenessCheckRequired() && isBlank(cc.getImplementationReview())) {
            throw new WorkflowException("Effectiveness review is required before closing this change control");
        }
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

    private void requireImpactAssessment(ChangeControl cc) {
        if (!settingsPolicy.enabled("change-control", "impactAssessmentRequired", true)) {
            return;
        }
        boolean hasAssessment = (cc.getImpactTasks() != null && !cc.getImpactTasks().isEmpty())
                || !isBlank(cc.getRadAssessment())
                || !isBlank(cc.getOtherDepartmentsReview())
                || !isBlank(cc.getQaComment())
                || !isBlank(cc.getRecommendations());
        if (!hasAssessment) {
            throw new WorkflowException("Impact assessment is required before routing change control");
        }
    }

    private static void addDepartments(ChangeControl cc, List<String> departments) {
        if (departments == null) return;
        departments.stream()
                .map(ChangeControlService::normalizeOptional)
                .filter(Objects::nonNull)
                .distinct()
                .forEach(cc.getInvolvedDepartments()::add);
    }

    private static void addImpactTasks(ChangeControl cc, List<CreateChangeControlRequest.ImpactTaskRequest> tasks) {
        if (tasks == null) return;
        for (CreateChangeControlRequest.ImpactTaskRequest request : tasks) {
            if (request == null) continue;
            String impactArea = normalizeOptional(request.impactArea());
            String applicability = normalizeOptional(request.applicability());
            String proposedTask = normalizeOptional(request.proposedTask());
            String taskAssignee = normalizeOptional(request.taskAssignee());
            String remarks = normalizeOptional(request.remarks());
            if (impactArea == null && applicability == null && proposedTask == null
                    && taskAssignee == null && remarks == null) {
                continue;
            }
            ChangeImpactTask task = new ChangeImpactTask();
            task.setCheckpointNo(request.checkpointNo());
            task.setImpactArea(impactArea);
            task.setApplicability(applicability);
            task.setProposedTask(proposedTask);
            task.setTaskAssignee(taskAssignee);
            task.setRemarks(remarks);
            cc.getImpactTasks().add(task);
        }
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
