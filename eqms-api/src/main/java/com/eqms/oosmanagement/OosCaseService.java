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
import com.eqms.oosmanagement.dto.CloseOosCaseRequest;
import com.eqms.oosmanagement.dto.CreateCapaFromOosRequest;
import com.eqms.oosmanagement.dto.CreateOosCaseRequest;
import com.eqms.oosmanagement.dto.DetermineDispositionRequest;
import com.eqms.oosmanagement.dto.InitialAssessmentRequest;
import com.eqms.oosmanagement.dto.RepeatResultRequest;
import com.eqms.oosmanagement.dto.RepeatTestingRequest;
import com.eqms.oosmanagement.dto.RootCauseAnalysisRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseRequest;
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
        this.capaService = capaService;
        this.capaRepository = capaRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

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
        if (oos.getOosStatus() != OosStatus.REPORTED) {
            throw new WorkflowException("OOS case can only be edited in REPORTED status");
        }
        if (request.testMethod() != null) oos.setTestMethod(request.testMethod());
        if (request.reportedResult() != null) oos.setReportedResult(request.reportedResult());
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "OOS case updated", actorId, actorName, ip, ua);
        return oos;
    }

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
        audit(id, AuditAction.UPDATE, "initial_assessment", null, request.likelyCause().name(),
                "Initial assessment recorded — likely cause: " + request.likelyCause(), actorId, actorName, ip, ua);
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
        if (findings == null || findings.isBlank()) {
            throw new WorkflowException("Investigation findings are required to begin full investigation");
        }

        OosInvestigation investigation = investigationRepository.findByOosId(id).orElseGet(OosInvestigation::new);
        investigation.setOosId(id);
        investigation.setInvestigationFindings(findings);
        investigation.setInvestigatorId(actorId);
        investigation.setInvestigationDate(Instant.now(clock));
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
                ? OosWorkflow.RECORD_REPEAT_PASS
                : OosWorkflow.RECORD_REPEAT_FAIL;
        String defaultReason = request.repeatResult() == RepeatTestResult.PASS
                ? "Repeat test passed — original result attributed to testing error"
                : "Repeat test failed — full investigation required";

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
        if (oos.getOosStatus() != OosStatus.INVESTIGATING) {
            throw new WorkflowException("Root cause analysis can only be submitted while investigating");
        }

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
                ? request.title()
                : "CAPA for OOS " + oos.getOosNo();
        Instant dueDateInstant = request.dueDate() == null ? null
                : request.dueDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.OOS, request.description(),
                        request.effectivenessCheckRequired(), dueDateInstant),
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
        transition(oos, OosWorkflow.CLOSE, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        return oos;
    }

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

    // --- internals ---------------------------------------------------------------------------

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
}
