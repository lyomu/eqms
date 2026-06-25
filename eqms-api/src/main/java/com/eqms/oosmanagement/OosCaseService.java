package com.eqms.oosmanagement;

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
import com.eqms.oosmanagement.dto.AddEvidenceRequest;
import com.eqms.oosmanagement.dto.AddInvestigationItemRequest;
import com.eqms.oosmanagement.dto.AddLinkedRecordRequest;
import com.eqms.oosmanagement.dto.AddRetestResampleRequest;
import com.eqms.oosmanagement.dto.CloseOosCaseRequest;
import com.eqms.oosmanagement.dto.CreateCapaFromOosRequest;
import com.eqms.oosmanagement.dto.CreateOosCaseRequest;
import com.eqms.oosmanagement.dto.DetermineDispositionRequest;
import com.eqms.oosmanagement.dto.InitialAssessmentRequest;
import com.eqms.oosmanagement.dto.OosTransitionRequest;
import com.eqms.oosmanagement.dto.QaReviewDecisionRequest;
import com.eqms.oosmanagement.dto.ReopenCaseRequest;
import com.eqms.oosmanagement.dto.RepeatResultRequest;
import com.eqms.oosmanagement.dto.RepeatTestingRequest;
import com.eqms.oosmanagement.dto.RootCauseAnalysisRequest;
import com.eqms.oosmanagement.dto.SaveContainmentRequest;
import com.eqms.oosmanagement.dto.SaveImpactAssessmentRequest;
import com.eqms.oosmanagement.dto.SaveInvestigationRequest;
import com.eqms.oosmanagement.dto.SaveLabAssessmentRequest;
import com.eqms.oosmanagement.dto.SaveRootCauseRequest;
import com.eqms.oosmanagement.dto.UpdateInvestigationItemRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseDetailsRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseRequest;
import com.eqms.oosmanagement.dto.UpdateRetestResampleRequest;
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
public class OosCaseService {

    private static final String OOS_PREFIX = "OOS";

    private final OosCaseRepository repository;
    private final OosInitialAssessmentRepository assessmentRepository;
    private final OosRepeatTestingRepository repeatTestingRepository;
    private final OosInvestigationRepository investigationRepository;
    private final OosDispositionRepository dispositionRepository;
    private final OosCapaLinkRepository capaLinkRepository;
    private final OosContainmentRepository containmentRepository;
    private final OosInvestigationItemRepository investigationItemRepository;
    private final OosRetestResampleRepository retestResampleRepository;
    private final OosImpactAssessmentRepository impactAssessmentRepository;
    private final OosRootCauseRepository rootCauseRepository;
    private final OosLinkedRecordRepository linkedRecordRepository;
    private final OosEvidenceRepository evidenceRepository;
    private final CapaService capaService;
    private final CapaRepository capaRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public OosCaseService(OosCaseRepository repository,
                          OosInitialAssessmentRepository assessmentRepository,
                          OosRepeatTestingRepository repeatTestingRepository,
                          OosInvestigationRepository investigationRepository,
                          OosDispositionRepository dispositionRepository,
                          OosCapaLinkRepository capaLinkRepository,
                          OosContainmentRepository containmentRepository,
                          OosInvestigationItemRepository investigationItemRepository,
                          OosRetestResampleRepository retestResampleRepository,
                          OosImpactAssessmentRepository impactAssessmentRepository,
                          OosRootCauseRepository rootCauseRepository,
                          OosLinkedRecordRepository linkedRecordRepository,
                          OosEvidenceRepository evidenceRepository,
                          CapaService capaService, CapaRepository capaRepository,
                          SequenceService sequenceService, WorkflowService workflowService,
                          SignatureService signatureService, AuditService auditService,
                          Clock utcClock) {
        this.repository = repository;
        this.assessmentRepository = assessmentRepository;
        this.repeatTestingRepository = repeatTestingRepository;
        this.investigationRepository = investigationRepository;
        this.dispositionRepository = dispositionRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.containmentRepository = containmentRepository;
        this.investigationItemRepository = investigationItemRepository;
        this.retestResampleRepository = retestResampleRepository;
        this.impactAssessmentRepository = impactAssessmentRepository;
        this.rootCauseRepository = rootCauseRepository;
        this.linkedRecordRepository = linkedRecordRepository;
        this.evidenceRepository = evidenceRepository;
        this.capaService = capaService;
        this.capaRepository = capaRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    // ========================================================================================
    // Core CRUD
    // ========================================================================================

    @Transactional
    public OosCase create(CreateOosCaseRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(OOS_PREFIX, year);

        OosCase oos = new OosCase();
        oos.setOosNo(number);
        oos.setProductId(request.productId());
        oos.setTestMethod(request.testMethod());
        oos.setSpecificationLimitMin(request.specificationLimitMin());
        oos.setSpecificationLimitMax(request.specificationLimitMax());
        oos.setReportedResult(request.reportedResult());
        oos.setReportedDate(Instant.now(clock));
        oos.setReportedById(actorId);
        oos.setReportedByName(request.reportedByName() != null ? request.reportedByName() : actorName);
        oos.setSubmittedBy(actorId);
        oos.setOosStatus(OosStatus.REPORTED);
        oos = repository.save(oos);

        audit(oos.getId(), AuditAction.CREATE, null, null, number,
                "OOS case created", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional(readOnly = true)
    public Page<OosCase> list(OosStatus status, Long productId, Pageable pageable) {
        if (status != null) return repository.findByOosStatus(status, pageable);
        if (productId != null) return repository.findByProductId(productId, pageable);
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public OosCase get(Long id) {
        return require(id);
    }

    @Transactional
    public OosCase update(Long id, UpdateOosCaseRequest request, Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        checkVersion(oos.getVersion(), request.expectedVersion());
        if (oos.getOosStatus() != OosStatus.REPORTED && oos.getOosStatus() != OosStatus.DRAFT) {
            throw new WorkflowException("OOS case can only be edited in REPORTED or DRAFT status");
        }
        if (request.testMethod() != null) oos.setTestMethod(request.testMethod());
        if (request.reportedResult() != null) oos.setReportedResult(request.reportedResult());
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "OOS case updated", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase updateDetails(Long id, UpdateOosCaseDetailsRequest request, Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        checkVersion(oos.getVersion(), request.expectedVersion());
        if (request.title() != null) oos.setTitle(request.title());
        if (request.description() != null) oos.setDescription(request.description());
        if (request.recordType() != null) oos.setRecordType(request.recordType());
        if (request.severity() != null) oos.setSeverity(request.severity());
        if (request.department() != null) oos.setDepartment(request.department());
        if (request.lab() != null) oos.setLab(request.lab());
        if (request.ownerId() != null) oos.setOwnerId(request.ownerId());
        if (request.qaReviewerId() != null) oos.setQaReviewerId(request.qaReviewerId());
        if (request.dueDate() != null) oos.setDueDate(request.dueDate());
        if (request.productId() != null) oos.setProductId(request.productId());
        if (request.testCategory() != null) oos.setTestCategory(request.testCategory());
        if (request.testName() != null) oos.setTestName(request.testName());
        if (request.testMethod() != null) oos.setTestMethod(request.testMethod());
        if (request.specificationLimitMin() != null) oos.setSpecificationLimitMin(request.specificationLimitMin());
        if (request.specificationLimitMax() != null) oos.setSpecificationLimitMax(request.specificationLimitMax());
        if (request.specificationReference() != null) oos.setSpecificationReference(request.specificationReference());
        if (request.trendLimit() != null) oos.setTrendLimit(request.trendLimit());
        if (request.reportedResult() != null) oos.setReportedResult(request.reportedResult());
        if (request.unitOfMeasure() != null) oos.setUnitOfMeasure(request.unitOfMeasure());
        if (request.sampleId() != null) oos.setSampleId(request.sampleId());
        if (request.sampleType() != null) oos.setSampleType(request.sampleType());
        if (request.batchId() != null) oos.setBatchId(request.batchId());
        if (request.materialId() != null) oos.setMaterialId(request.materialId());
        if (request.materialLotId() != null) oos.setMaterialLotId(request.materialLotId());
        if (request.analystId() != null) oos.setAnalystId(request.analystId());
        if (request.reviewerId() != null) oos.setReviewerId(request.reviewerId());
        if (request.equipmentId() != null) oos.setEquipmentId(request.equipmentId());
        if (request.calibrationStatusAtTest() != null) oos.setCalibrationStatusAtTest(request.calibrationStatusAtTest());
        if (request.reagentUsed() != null) oos.setReagentUsed(request.reagentUsed());
        if (request.reagentLot() != null) oos.setReagentLot(request.reagentLot());
        if (request.referenceStdLot() != null) oos.setReferenceStdLot(request.referenceStdLot());
        oos.setImmediateHoldRequired(request.immediateHoldRequired());
        oos.setHoldApplied(request.holdApplied());
        if (request.holdAppliedTo() != null) oos.setHoldAppliedTo(request.holdAppliedTo());
        if (request.holdReason() != null) oos.setHoldReason(request.holdReason());
        if (request.immediateActionTaken() != null) oos.setImmediateActionTaken(request.immediateActionTaken());
        oos.setProductionImpact(request.productionImpact());
        oos.setReleasedProductImpact(request.releasedProductImpact());
        oos.setCustomerImpact(request.customerImpact());
        oos.setRegulatoryImpact(request.regulatoryImpact());
        oos.setInvestigationRequired(request.investigationRequired());
        oos.setCapaRequired(request.capaRequired());
        oos.setRetestRequested(request.retestRequested());
        oos.setResampleRequested(request.resampleRequested());
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "OOS case details updated", actorId, actorName, ip, ua);
        return oos;
    }

    // ========================================================================================
    // Existing workflow methods (preserved)
    // ========================================================================================

    @Transactional
    public OosCase initialAssessment(Long id, InitialAssessmentRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        if (request.assessmentFindings() == null || request.assessmentFindings().isBlank()) {
            throw new WorkflowException("Assessment findings are required");
        }

        OosInitialAssessment assessment = assessmentRepository.findByOosId(id)
                .orElseGet(OosInitialAssessment::new);
        assessment.setOosId(id);
        assessment.setAssessmentFindings(request.assessmentFindings());
        assessment.setLikelyCause(request.likelyCause());
        assessment.setAssessorId(actorId);
        assessment.setAssessmentDate(Instant.now(clock));
        assessmentRepository.save(assessment);

        transition(oos, OosWorkflow.ASSESS, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Initial assessment completed",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "initial_assessment", null, request.likelyCause() == null ? null : request.likelyCause().name(),
                "Initial assessment recorded", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase saveLabAssessment(Long id, SaveLabAssessmentRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        OosInitialAssessment assessment = assessmentRepository.findByOosId(id)
                .orElseGet(OosInitialAssessment::new);
        assessment.setOosId(id);
        assessment.setAssessmentFindings(request.assessmentFindings());
        assessment.setLikelyCause(request.likelyCause());
        assessment.setLabSupervisorId(request.labSupervisorId());
        assessment.setLabSupervisorReview(request.labSupervisorReview());
        assessment.setAssessmentOutcome(request.assessmentOutcome());
        assessment.setLabErrorDescription(request.labErrorDescription());
        assessment.setAssessmentComments(request.assessmentComments());
        if (request.labErrorSuspected() != null) assessment.setLabErrorSuspected(request.labErrorSuspected());
        if (request.correctSampleTested() != null) assessment.setCorrectSampleTested(request.correctSampleTested());
        if (request.correctTestMethodUsed() != null) assessment.setCorrectTestMethodUsed(request.correctTestMethodUsed());
        if (request.correctSpecificationApplied() != null) assessment.setCorrectSpecificationApplied(request.correctSpecificationApplied());
        if (request.calculationsChecked() != null) assessment.setCalculationsChecked(request.calculationsChecked());
        if (request.dilutionsChecked() != null) assessment.setDilutionsChecked(request.dilutionsChecked());
        if (request.systemSuitabilityChecked() != null) assessment.setSystemSuitabilityChecked(request.systemSuitabilityChecked());
        if (request.instrumentCalibrationValid() != null) assessment.setInstrumentCalibrationValid(request.instrumentCalibrationValid());
        if (request.instrumentPerformanceAcceptable() != null) assessment.setInstrumentPerformanceAcceptable(request.instrumentPerformanceAcceptable());
        if (request.reagentsStandardsValid() != null) assessment.setReagentsStandardsValid(request.reagentsStandardsValid());
        if (request.analystFollowedProcedure() != null) assessment.setAnalystFollowedProcedure(request.analystFollowedProcedure());
        if (request.environmentalConditionsAcceptable() != null) assessment.setEnvironmentalConditionsAcceptable(request.environmentalConditionsAcceptable());
        if (request.samplePreparationChecked() != null) assessment.setSamplePreparationChecked(request.samplePreparationChecked());
        if (request.rawDataReviewed() != null) assessment.setRawDataReviewed(request.rawDataReviewed());
        if (request.transcriptionChecked() != null) assessment.setTranscriptionChecked(request.transcriptionChecked());
        if (request.previousResultsReviewed() != null) assessment.setPreviousResultsReviewed(request.previousResultsReviewed());
        if (assessment.getAssessorId() == null) assessment.setAssessorId(actorId);
        if (assessment.getAssessmentDate() == null) assessment.setAssessmentDate(Instant.now(clock));
        assessmentRepository.save(assessment);

        if (oos.getOosStatus() == OosStatus.REPORTED) {
            transition(oos, OosWorkflow.ASSESS, request.expectedVersion(),
                    request.reason() != null ? request.reason() : "Initial lab assessment completed",
                    actorId, actorName, ip, ua);
        }
        audit(id, AuditAction.UPDATE, "lab_assessment", null, "saved",
                "Lab assessment recorded", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase orderRepeatTesting(Long id, RepeatTestingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        OosRepeatTesting repeat = repeatTestingRepository.findByOosId(id).orElseGet(OosRepeatTesting::new);
        repeat.setOosId(id);
        repeat.setRepeatOrderedDate(Instant.now(clock));
        repeatTestingRepository.save(repeat);

        transition(oos, OosWorkflow.ORDER_REPEAT, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Repeat testing ordered", actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "repeat_testing", null, "ordered",
                "Repeat testing ordered", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase beginInvestigation(Long id, int v, String findings, String reason,
                                      Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        OosInvestigation investigation = investigationRepository.findByOosId(id).orElseGet(OosInvestigation::new);
        investigation.setOosId(id);
        if (findings != null) investigation.setInvestigationFindings(findings);
        investigation.setInvestigatorId(actorId);
        investigation.setInvestigationDate(Instant.now(clock));
        investigation.setInvestigationStatus(OosInvestigationStatus.IN_PROGRESS);
        investigationRepository.save(investigation);

        transition(oos, OosWorkflow.BEGIN_INVESTIGATION, v,
                reason != null ? reason : "Full investigation initiated", actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "investigation", null, "started",
                "Full investigation initiated", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase recordRepeatResult(Long id, RepeatResultRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        OosRepeatTesting repeat = repeatTestingRepository.findByOosId(id)
                .orElseThrow(() -> new WorkflowException("Repeat testing has not been ordered for this OOS case"));
        repeat.setRepeatResult(request.repeatResult());
        repeat.setRepeatTestDate(Instant.now(clock));
        repeat.setTestTechnicianId(actorId);
        repeat.setTestTechnicianName(request.testTechnicianName() != null ? request.testTechnicianName() : actorName);
        repeat.setNotes(request.notes());
        repeatTestingRepository.save(repeat);

        String action = request.repeatResult() == RepeatTestResult.PASS
                ? OosWorkflow.RECORD_REPEAT_PASS : OosWorkflow.RECORD_REPEAT_FAIL;
        String defaultReason = request.repeatResult() == RepeatTestResult.PASS
                ? "Repeat test passed" : "Repeat test failed — full investigation required";

        if (request.repeatResult() == RepeatTestResult.PASS) {
            OosDispositionRecord disposition = dispositionRepository.findByOosId(id).orElseGet(OosDispositionRecord::new);
            disposition.setOosId(id);
            disposition.setDisposition(OosDispositionDecision.ACCEPT);
            disposition.setRationale("Repeat test passed; original result attributed to testing error");
            disposition.setApprovedBy(actorId);
            disposition.setApprovedDate(Instant.now(clock));
            dispositionRepository.save(disposition);
        }

        transition(oos, action, request.expectedVersion(),
                request.reason() != null ? request.reason() : defaultReason, actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "repeat_result", null, request.repeatResult().name(),
                "Repeat test result: " + request.repeatResult(), actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase rootCauseAnalysis(Long id, RootCauseAnalysisRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        OosInvestigation investigation = investigationRepository.findByOosId(id).orElseGet(OosInvestigation::new);
        investigation.setOosId(id);
        investigation.setInvestigationFindings(request.investigationFindings());
        if (request.rootCause() != null) investigation.setRootCause(request.rootCause());
        if (request.rootCauseMethod() != null) investigation.setRootCauseMethod(request.rootCauseMethod());
        if (investigation.getInvestigatorId() == null) investigation.setInvestigatorId(actorId);
        if (investigation.getInvestigationDate() == null) investigation.setInvestigationDate(Instant.now(clock));
        investigationRepository.save(investigation);

        audit(id, AuditAction.UPDATE, "root_cause", null, request.rootCause(),
                request.reason() != null ? request.reason() : "Root cause analysis submitted",
                actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase determineDisposition(Long id, DetermineDispositionRequest request,
                                        boolean firstSignatureInSession,
                                        Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(OosWorkflow.RECORD_TYPE).recordId(String.valueOf(oos.getId()))
                .contentHash(oos.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I approve the disposition decision for this OOS investigation: " + request.disposition().name())
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        OosDispositionRecord disposition = dispositionRepository.findByOosId(id).orElseGet(OosDispositionRecord::new);
        disposition.setOosId(id);
        disposition.setDisposition(request.disposition());
        disposition.setRationale(request.rationale());
        disposition.setApprovedBy(actorId);
        disposition.setApprovedDate(Instant.now(clock));
        dispositionRepository.save(disposition);

        transition(oos, OosWorkflow.DETERMINE_DISPOSITION, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Disposition determined: " + request.disposition(),
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "disposition", null, request.disposition().name(),
                "Disposition determined: " + request.disposition(), actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public Capa createCapa(Long id, CreateCapaFromOosRequest request,
                           Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        String title = (request.title() != null && !request.title().isBlank())
                ? request.title() : "CAPA for OOS " + oos.getOosNo();
        Instant dueDateInstant = request.dueDate() == null ? null
                : request.dueDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.OOS, request.description(),
                        request.effectivenessCheckRequired(), dueDateInstant,
                        null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null),
                actorId, actorName, ip, ua);

        if (!capaLinkRepository.existsByOosIdAndCapaId(id, capa.getId())) {
            OosCapaLink link = new OosCapaLink();
            link.setOosId(id);
            link.setCapaId(capa.getId());
            capaLinkRepository.save(link);
        }

        audit(id, AuditAction.UPDATE, "capa_link", null, String.valueOf(capa.getId()),
                request.reason() != null ? request.reason() : "CAPA created from OOS", actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional
    public OosCase close(Long id, CloseOosCaseRequest request, boolean firstSignatureInSession,
                         Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(OosWorkflow.RECORD_TYPE).recordId(String.valueOf(oos.getId()))
                .contentHash(oos.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I confirm this OOS investigation is complete and approve its closure.")
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        oos.setClosedDate(Instant.now(clock));
        oos.setClosedById(actorId);
        transition(oos, OosWorkflow.CLOSE, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        return oos;
    }

    // ========================================================================================
    // New workflow transitions
    // ========================================================================================

    @Transactional
    public OosCase submitForQaReview(Long id, OosTransitionRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        transition(oos, OosWorkflow.SUBMIT_FOR_QA_REVIEW, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Submitted for QA review",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.QA_REVIEW.name(),
                "Submitted for QA review", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase qaOrderRetest(Long id, OosTransitionRequest request,
                                 Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        transition(oos, OosWorkflow.QA_ORDER_RETEST, request.expectedVersion(),
                request.reason() != null ? request.reason() : "QA ordered retest",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.RETEST_PENDING.name(),
                "QA ordered retest", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase qaOrderResample(Long id, OosTransitionRequest request,
                                   Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        transition(oos, OosWorkflow.QA_ORDER_RESAMPLE, request.expectedVersion(),
                request.reason() != null ? request.reason() : "QA ordered resample",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.RESAMPLE_PENDING.name(),
                "QA ordered resample", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase qaApproveInvestigation(Long id, OosTransitionRequest request,
                                          Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        transition(oos, OosWorkflow.QA_APPROVE_INVESTIGATION, request.expectedVersion(),
                request.reason() != null ? request.reason() : "QA approved investigation — proceeding to disposition",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.DISPOSITION_PENDING.name(),
                "QA approved investigation", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase recordRetestResult(Long id, Long testId, UpdateRetestResampleRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosRetestResample test = retestResampleRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Retest/resample record not found: " + testId));
        if (!test.getOosId().equals(id)) throw new WorkflowException("Test record does not belong to this OOS case");

        if (request.result() != null) test.setResult(request.result());
        if (request.resultPass() != null) test.setResultPass(request.resultPass());
        if (request.equipmentUsed() != null) test.setEquipmentUsed(request.equipmentUsed());
        if (request.analystComments() != null) test.setAnalystComments(request.analystComments());
        if (request.testStatus() != null) test.setTestStatus(request.testStatus());
        if (request.reviewerId() != null) {
            test.setReviewerId(request.reviewerId());
            test.setReviewedDate(Instant.now(clock));
        }
        retestResampleRepository.save(test);

        OosCase oos = require(id);
        if (request.testStatus() == OosRetestStatus.COMPLETED && request.resultPass() != null) {
            String action = Boolean.TRUE.equals(request.resultPass())
                    ? (test.getTestType() == OosRetestType.RETEST ? OosWorkflow.RETEST_PASS : OosWorkflow.RESAMPLE_PASS)
                    : (test.getTestType() == OosRetestType.RETEST ? OosWorkflow.RETEST_FAIL : OosWorkflow.RESAMPLE_FAIL);
            if (isValidTransitionFromCurrentStatus(oos, action)) {
                OosTransitionRequest tr = new OosTransitionRequest(oos.getVersion(),
                        request.reason() != null ? request.reason() : "Retest/resample result recorded: " + (Boolean.TRUE.equals(request.resultPass()) ? "PASS" : "FAIL"));
                transition(oos, action, tr.expectedVersion(), tr.reason(), actorId, actorName, ip, ua);
            }
        }
        audit(id, AuditAction.UPDATE, "retest_result", null, request.result(),
                "Retest/resample result updated", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase requireCapa(Long id, OosTransitionRequest request,
                               Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        oos.setCapaRequired(true);
        transition(oos, OosWorkflow.REQUIRE_CAPA, request.expectedVersion(),
                request.reason() != null ? request.reason() : "CAPA required before disposition",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.CAPA_REQUIRED.name(),
                "CAPA required flagged", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase capaCompleteProceed(Long id, OosTransitionRequest request,
                                       Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        transition(oos, OosWorkflow.CAPA_COMPLETE_PROCEED, request.expectedVersion(),
                request.reason() != null ? request.reason() : "CAPA completed — proceeding to disposition",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.DISPOSITION_PENDING.name(),
                "CAPA complete — proceeding to disposition", actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase qaDispose(Long id, DetermineDispositionRequest request, boolean firstSignatureInSession,
                             Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(OosWorkflow.RECORD_TYPE).recordId(String.valueOf(oos.getId()))
                .contentHash(oos.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I approve the QA disposition decision: " + request.disposition().name())
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        OosDispositionRecord disposition = dispositionRepository.findByOosId(id).orElseGet(OosDispositionRecord::new);
        disposition.setOosId(id);
        disposition.setDisposition(request.disposition());
        disposition.setRationale(request.rationale());
        disposition.setApprovedBy(actorId);
        disposition.setApprovedDate(Instant.now(clock));
        dispositionRepository.save(disposition);

        transition(oos, OosWorkflow.QA_DISPOSE, request.expectedVersion(),
                request.reason() != null ? request.reason() : "QA disposition: " + request.disposition(),
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "disposition", null, request.disposition().name(),
                "QA disposition determined: " + request.disposition(), actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase reopen(Long id, ReopenCaseRequest request, boolean firstSignatureInSession,
                          Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(OosWorkflow.RECORD_TYPE).recordId(String.valueOf(oos.getId()))
                .contentHash(oos.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I authorise the reopening of this OOS investigation.")
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        oos.setReopenedById(actorId);
        oos.setReopenedAt(Instant.now(clock));
        transition(oos, OosWorkflow.REOPEN, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.REOPENED.name(),
                "OOS case reopened: " + request.reason(), actorId, actorName, ip, ua);
        return oos;
    }

    @Transactional
    public OosCase cancel(Long id, OosTransitionRequest request,
                          Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        String action = oos.getOosStatus() == OosStatus.DRAFT
                ? OosWorkflow.CANCEL : OosWorkflow.CANCEL_REPORTED;
        transition(oos, action, request.expectedVersion(),
                request.reason() != null ? request.reason() : "OOS case cancelled",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "status", null, OosStatus.CANCELLED.name(),
                "OOS case cancelled", actorId, actorName, ip, ua);
        return oos;
    }

    // ========================================================================================
    // Sub-entity methods — Containment
    // ========================================================================================

    @Transactional
    public OosContainment saveContainment(Long id, SaveContainmentRequest request,
                                          Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosContainment c = containmentRepository.findByOosId(id).orElseGet(OosContainment::new);
        c.setOosId(id);
        c.setHoldRequired(request.holdRequired());
        if (request.holdType() != null) c.setHoldType(request.holdType());
        if (request.holdTarget() != null) c.setHoldTarget(request.holdTarget());
        if (request.targetReference() != null) c.setTargetReference(request.targetReference());
        if (request.holdReason() != null) c.setHoldReason(request.holdReason());
        if (request.immediateActions() != null) c.setImmediateActions(request.immediateActions());
        c.setNotificationIssued(request.notificationIssued());
        c.setRegulatoryNotificationRequired(request.regulatoryNotificationRequired());
        c.setCustomerNotificationRequired(request.customerNotificationRequired());
        if (request.notes() != null) c.setNotes(request.notes());
        if (request.containmentStatus() != null) c.setContainmentStatus(request.containmentStatus());
        c.setUpdatedBy(actorId);

        if (request.holdRequired() && c.getHoldAppliedAt() == null) {
            c.setHoldAppliedAt(Instant.now(clock));
            c.setHoldAppliedBy(actorId);
        }
        containmentRepository.save(c);
        audit(id, AuditAction.UPDATE, "containment", null, "saved",
                "Immediate containment saved", actorId, actorName, ip, ua);
        return c;
    }

    @Transactional(readOnly = true)
    public OosContainment getContainment(Long oosId) {
        return containmentRepository.findByOosId(oosId).orElse(null);
    }

    // ========================================================================================
    // Sub-entity methods — Investigation Items
    // ========================================================================================

    @Transactional
    public OosInvestigationItem addInvestigationItem(Long id, AddInvestigationItemRequest request,
                                                     Long actorId, String actorName, String ip, String ua) {
        require(id);
        int nextNum = investigationItemRepository.findAllByOosIdOrderByItemNumberAsc(id).size() + 1;
        OosInvestigationItem item = new OosInvestigationItem();
        item.setOosId(id);
        item.setItemType(request.itemType());
        item.setItemNumber(nextNum);
        item.setDescription(request.description());
        if (request.finding() != null) item.setFinding(request.finding());
        if (request.source() != null) item.setSource(request.source());
        if (request.evidenceRef() != null) item.setEvidenceRef(request.evidenceRef());
        item.setPerformedById(request.performedById() != null ? request.performedById() : actorId);
        item.setPerformedDate(Instant.now(clock));
        item.setItemStatus(OosInvestigationItemStatus.OPEN);
        item.setUpdatedBy(actorId);
        investigationItemRepository.save(item);
        audit(id, AuditAction.UPDATE, "investigation_item", null, String.valueOf(nextNum),
                "Investigation item added", actorId, actorName, ip, ua);
        return item;
    }

    @Transactional(readOnly = true)
    public List<OosInvestigationItem> listInvestigationItems(Long oosId) {
        return investigationItemRepository.findAllByOosIdOrderByItemNumberAsc(oosId);
    }

    @Transactional
    public OosInvestigationItem updateInvestigationItem(Long id, Long itemId, UpdateInvestigationItemRequest request,
                                                        Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosInvestigationItem item = investigationItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Investigation item not found: " + itemId));
        if (!item.getOosId().equals(id)) throw new WorkflowException("Item does not belong to this OOS case");
        if (request.description() != null) item.setDescription(request.description());
        if (request.finding() != null) item.setFinding(request.finding());
        if (request.source() != null) item.setSource(request.source());
        if (request.evidenceRef() != null) item.setEvidenceRef(request.evidenceRef());
        if (request.itemStatus() != null) item.setItemStatus(request.itemStatus());
        item.setUpdatedBy(actorId);
        investigationItemRepository.save(item);
        audit(id, AuditAction.UPDATE, "investigation_item", null, String.valueOf(itemId),
                "Investigation item updated", actorId, actorName, ip, ua);
        return item;
    }

    @Transactional
    public void removeInvestigationItem(Long id, Long itemId, Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosInvestigationItem item = investigationItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Investigation item not found: " + itemId));
        if (!item.getOosId().equals(id)) throw new WorkflowException("Item does not belong to this OOS case");
        investigationItemRepository.delete(item);
        audit(id, AuditAction.UPDATE, "investigation_item", String.valueOf(itemId), null,
                "Investigation item removed", actorId, actorName, ip, ua);
    }

    // ========================================================================================
    // Sub-entity methods — Retest/Resample
    // ========================================================================================

    @Transactional
    public OosRetestResample addRetestResample(Long id, AddRetestResampleRequest request,
                                               Long actorId, String actorName, String ip, String ua) {
        require(id);
        int nextNum = retestResampleRepository.findAllByOosIdOrderByTestNumberAsc(id).size() + 1;
        OosRetestResample test = new OosRetestResample();
        test.setOosId(id);
        test.setTestType(request.testType());
        test.setTestNumber(nextNum);
        test.setOrderedById(actorId);
        test.setOrderedDate(Instant.now(clock));
        if (request.rationale() != null) test.setRationale(request.rationale());
        if (request.sampleReference() != null) test.setSampleReference(request.sampleReference());
        test.setTestStatus(OosRetestStatus.PENDING);
        test.setUpdatedBy(actorId);
        retestResampleRepository.save(test);
        audit(id, AuditAction.UPDATE, "retest_resample", null, request.testType().name(),
                request.testType() + " ordered (#" + nextNum + ")", actorId, actorName, ip, ua);
        return test;
    }

    @Transactional(readOnly = true)
    public List<OosRetestResample> listRetestResample(Long oosId) {
        return retestResampleRepository.findAllByOosIdOrderByTestNumberAsc(oosId);
    }

    @Transactional
    public OosRetestResample updateRetestResample(Long id, Long testId, UpdateRetestResampleRequest request,
                                                  Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosRetestResample test = retestResampleRepository.findById(testId)
                .orElseThrow(() -> new ResourceNotFoundException("Retest/resample record not found: " + testId));
        if (!test.getOosId().equals(id)) throw new WorkflowException("Test record does not belong to this OOS case");
        if (request.result() != null) test.setResult(request.result());
        if (request.resultPass() != null) test.setResultPass(request.resultPass());
        if (request.equipmentUsed() != null) test.setEquipmentUsed(request.equipmentUsed());
        if (request.analystComments() != null) test.setAnalystComments(request.analystComments());
        if (request.testStatus() != null) test.setTestStatus(request.testStatus());
        if (request.reviewerId() != null) {
            test.setReviewerId(request.reviewerId());
            test.setReviewedDate(Instant.now(clock));
        }
        test.setUpdatedBy(actorId);
        retestResampleRepository.save(test);
        audit(id, AuditAction.UPDATE, "retest_result", null, request.result(),
                "Retest/resample result updated", actorId, actorName, ip, ua);
        return test;
    }

    // ========================================================================================
    // Sub-entity methods — Impact Assessment
    // ========================================================================================

    @Transactional
    public OosImpactAssessment saveImpactAssessment(Long id, SaveImpactAssessmentRequest request,
                                                    Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosImpactAssessment ia = impactAssessmentRepository.findByOosId(id).orElseGet(OosImpactAssessment::new);
        ia.setOosId(id);
        if (request.scopeOfImpact() != null) ia.setScopeOfImpact(request.scopeOfImpact());
        if (request.batchesPotentiallyAffected() != null) ia.setBatchesPotentiallyAffected(request.batchesPotentiallyAffected());
        if (request.productsPotentiallyAffected() != null) ia.setProductsPotentiallyAffected(request.productsPotentiallyAffected());
        ia.setReleasedProductImpact(request.releasedProductImpact());
        ia.setCustomerImpact(request.customerImpact());
        ia.setRegulatoryImpact(request.regulatoryImpact());
        if (request.patientSafetyRisk() != null) ia.setPatientSafetyRisk(request.patientSafetyRisk());
        if (request.riskJustification() != null) ia.setRiskJustification(request.riskJustification());
        ia.setQuarantineRequired(request.quarantineRequired());
        ia.setRecallRequired(request.recallRequired());
        ia.setAuthorityNotificationRequired(request.authorityNotificationRequired());
        if (request.assessedById() != null) ia.setAssessedById(request.assessedById());
        else if (ia.getAssessedById() == null) ia.setAssessedById(actorId);
        if (ia.getAssessedDate() == null) ia.setAssessedDate(Instant.now(clock));
        ia.setUpdatedBy(actorId);
        impactAssessmentRepository.save(ia);
        audit(id, AuditAction.UPDATE, "impact_assessment", null, "saved",
                "Impact assessment saved", actorId, actorName, ip, ua);
        return ia;
    }

    @Transactional(readOnly = true)
    public OosImpactAssessment getImpactAssessment(Long oosId) {
        return impactAssessmentRepository.findByOosId(oosId).orElse(null);
    }

    // ========================================================================================
    // Sub-entity methods — Root Cause
    // ========================================================================================

    @Transactional
    public OosRootCause saveRootCause(Long id, SaveRootCauseRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        OosCase oos = require(id);
        checkVersion(oos.getVersion(), request.expectedVersion());
        OosRootCause rc = rootCauseRepository.findByOosId(id).orElseGet(OosRootCause::new);
        rc.setOosId(id);
        if (request.rootCauseCategory() != null) rc.setRootCauseCategory(request.rootCauseCategory());
        if (request.rootCauseDescription() != null) rc.setRootCauseDescription(request.rootCauseDescription());
        if (request.rootCauseMethod() != null) rc.setRootCauseMethod(request.rootCauseMethod());
        if (request.contributingFactors() != null) rc.setContributingFactors(request.contributingFactors());
        if (request.immediateCause() != null) rc.setImmediateCause(request.immediateCause());
        rc.setSystematicIssue(request.systematicIssue());
        if (request.recurrencePrevention() != null) rc.setRecurrencePrevention(request.recurrencePrevention());
        if (request.assessedById() != null) rc.setAssessedById(request.assessedById());
        else if (rc.getAssessedById() == null) rc.setAssessedById(actorId);
        if (rc.getAssessedDate() == null) rc.setAssessedDate(Instant.now(clock));
        if (request.reviewedById() != null) {
            rc.setReviewedById(request.reviewedById());
            rc.setReviewedDate(Instant.now(clock));
        }
        rc.setUpdatedBy(actorId);
        rootCauseRepository.save(rc);
        audit(id, AuditAction.UPDATE, "root_cause", null, "saved",
                "Root cause analysis saved", actorId, actorName, ip, ua);
        return rc;
    }

    @Transactional(readOnly = true)
    public OosRootCause getRootCause(Long oosId) {
        return rootCauseRepository.findByOosId(oosId).orElse(null);
    }

    // ========================================================================================
    // Sub-entity methods — Linked Records
    // ========================================================================================

    @Transactional
    public OosLinkedRecord addLinkedRecord(Long id, AddLinkedRecordRequest request,
                                           Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosLinkedRecord lr = new OosLinkedRecord();
        lr.setOosId(id);
        lr.setLinkedRecordType(request.linkedRecordType());
        lr.setLinkedRecordId(request.linkedRecordId());
        if (request.linkedRecordReference() != null) lr.setLinkedRecordReference(request.linkedRecordReference());
        if (request.linkedRecordTitle() != null) lr.setLinkedRecordTitle(request.linkedRecordTitle());
        if (request.linkedRecordStatus() != null) lr.setLinkedRecordStatus(request.linkedRecordStatus());
        if (request.relationshipType() != null) lr.setRelationshipType(request.relationshipType());
        if (request.notes() != null) lr.setNotes(request.notes());
        lr.setAddedBy(actorId);
        linkedRecordRepository.save(lr);
        audit(id, AuditAction.UPDATE, "linked_record", null, request.linkedRecordType().name(),
                "Linked record added: " + request.linkedRecordReference(), actorId, actorName, ip, ua);
        return lr;
    }

    @Transactional(readOnly = true)
    public List<OosLinkedRecord> listLinkedRecords(Long oosId) {
        return linkedRecordRepository.findAllByOosId(oosId);
    }

    @Transactional
    public void removeLinkedRecord(Long id, Long recordId, Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosLinkedRecord lr = linkedRecordRepository.findById(recordId)
                .orElseThrow(() -> new ResourceNotFoundException("Linked record not found: " + recordId));
        if (!lr.getOosId().equals(id)) throw new WorkflowException("Linked record does not belong to this OOS case");
        linkedRecordRepository.delete(lr);
        audit(id, AuditAction.UPDATE, "linked_record", String.valueOf(recordId), null,
                "Linked record removed", actorId, actorName, ip, ua);
    }

    // ========================================================================================
    // Sub-entity methods — Evidence
    // ========================================================================================

    @Transactional
    public OosEvidence addEvidence(Long id, AddEvidenceRequest request,
                                   Long actorId, String actorName, String ip, String ua) {
        require(id);
        int nextNum = evidenceRepository.findAllByOosIdOrderByEvidenceNumberAsc(id).size() + 1;
        OosEvidence ev = new OosEvidence();
        ev.setOosId(id);
        ev.setEvidenceType(request.evidenceType());
        ev.setEvidenceNumber(nextNum);
        ev.setTitle(request.title());
        if (request.description() != null) ev.setDescription(request.description());
        if (request.fileName() != null) ev.setFileName(request.fileName());
        if (request.fileSize() != null) ev.setFileSize(request.fileSize());
        if (request.contentType() != null) ev.setContentType(request.contentType());
        if (request.attachmentId() != null) ev.setAttachmentId(request.attachmentId());
        ev.setSubmittedBy(actorId);
        ev.setSubmittedDate(Instant.now(clock));
        ev.setEvidenceStatus(OosEvidenceStatus.PENDING_REVIEW);
        ev.setUpdatedBy(actorId);
        evidenceRepository.save(ev);
        audit(id, AuditAction.UPDATE, "evidence", null, request.title(),
                "Evidence added: " + request.title(), actorId, actorName, ip, ua);
        return ev;
    }

    @Transactional(readOnly = true)
    public List<OosEvidence> listEvidence(Long oosId) {
        return evidenceRepository.findAllByOosIdOrderByEvidenceNumberAsc(oosId);
    }

    @Transactional
    public void removeEvidence(Long id, Long evidenceId, Long actorId, String actorName, String ip, String ua) {
        require(id);
        OosEvidence ev = evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found: " + evidenceId));
        if (!ev.getOosId().equals(id)) throw new WorkflowException("Evidence does not belong to this OOS case");
        evidenceRepository.delete(ev);
        audit(id, AuditAction.UPDATE, "evidence", String.valueOf(evidenceId), null,
                "Evidence removed", actorId, actorName, ip, ua);
    }

    // ========================================================================================
    // Existing getters (preserved)
    // ========================================================================================

    @Transactional(readOnly = true)
    public OosInitialAssessment getAssessment(Long oosId) {
        return assessmentRepository.findByOosId(oosId).orElse(null);
    }

    @Transactional(readOnly = true)
    public OosRepeatTesting getRepeatTesting(Long oosId) {
        return repeatTestingRepository.findByOosId(oosId).orElse(null);
    }

    @Transactional(readOnly = true)
    public OosInvestigation getInvestigation(Long oosId) {
        return investigationRepository.findByOosId(oosId).orElse(null);
    }

    @Transactional(readOnly = true)
    public OosDispositionRecord getDisposition(Long oosId) {
        return dispositionRepository.findByOosId(oosId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Long> getLinkedCapaIds(Long oosId) {
        return capaLinkRepository.findByOosId(oosId).stream().map(OosCapaLink::getCapaId).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(OosWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // ========================================================================================
    // Internal helpers
    // ========================================================================================

    private void transition(OosCase oos, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(OosWorkflow.DEFINITION, oos,
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
                .recordType(OosWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private OosCase require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OOS case not found: " + id));
    }

    private boolean isValidTransitionFromCurrentStatus(OosCase oos, String action) {
        return OosWorkflow.DEFINITION.find(oos.getStatus(), action).isPresent();
    }
}
