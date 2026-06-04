package com.eqms.risks;

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
import com.eqms.common.ResourceNotFoundException;
import com.eqms.risks.dto.CreateRiskRequest;
import com.eqms.risks.dto.HazardAnalysisRequest;
import com.eqms.risks.dto.MitigationPlanRequest;
import com.eqms.risks.dto.UpdateRiskRequest;
import com.eqms.risks.dto.VerifyEffectivenessRequest;
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
 * Risk Management application service (ISO 31000 / ICH Q9). Status changes go through
 * {@link WorkflowService}; the management-acceptance signature through {@link SignatureService};
 * numbering through {@link SequenceService}. Risk score is computed (never client-supplied) as
 * severity × probability; acceptance is gated on a verified-acceptable residual risk.
 */
@Service
public class RiskService {

    private static final String RISK_PREFIX = "RISK";

    private final RiskRepository repository;
    private final RiskAnalysisRepository analysisRepository;
    private final RiskMitigationRepository mitigationRepository;
    private final RiskControlEffectivenessRepository effectivenessRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public RiskService(RiskRepository repository, RiskAnalysisRepository analysisRepository,
                       RiskMitigationRepository mitigationRepository,
                       RiskControlEffectivenessRepository effectivenessRepository,
                       SequenceService sequenceService, WorkflowService workflowService,
                       SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.analysisRepository = analysisRepository;
        this.mitigationRepository = mitigationRepository;
        this.effectivenessRepository = effectivenessRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Risk create(CreateRiskRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(RISK_PREFIX, year);

        Risk risk = new Risk();
        risk.setRiskNo(number);
        risk.setTitle(request.title());
        risk.setCategory(request.category());
        risk.setDescription(request.description());
        risk.setPotentialImpact(request.potentialImpact());
        risk.setOwnerId(actorId);
        risk.setRiskStatus(RiskStatus.IDENTIFIED);
        risk = repository.save(risk);

        audit(risk.getId(), AuditAction.CREATE, null, null, number, "Risk identified", actorId, actorName, ip, ua);
        return risk;
    }

    @Transactional(readOnly = true)
    public Page<Risk> list(RiskStatus status, RiskCategory category, Pageable pageable) {
        if (status != null) {
            return repository.findByRiskStatus(status, pageable);
        }
        if (category != null) {
            return repository.findByCategory(category, pageable);
        }
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Risk get(Long id) {
        return require(id);
    }

    @Transactional(readOnly = true)
    public RiskAnalysis getAnalysis(Long riskId) {
        return analysisRepository.findByRiskId(riskId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RiskMitigation> getMitigations(Long riskId) {
        return mitigationRepository.findByRiskIdOrderByIdAsc(riskId);
    }

    @Transactional(readOnly = true)
    public List<RiskControlEffectiveness> getEffectiveness(Long riskId) {
        return effectivenessRepository.findByRiskIdOrderByVerificationDateDesc(riskId);
    }

    @Transactional
    public Risk update(Long id, UpdateRiskRequest request, Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        checkVersion(risk.getVersion(), request.expectedVersion());
        if (risk.getRiskStatus() != RiskStatus.IDENTIFIED) {
            throw new WorkflowException("Risk details can only be edited while IDENTIFIED");
        }
        if (request.title() != null) {
            risk.setTitle(request.title());
        }
        if (request.description() != null) {
            risk.setDescription(request.description());
        }
        if (request.potentialImpact() != null) {
            risk.setPotentialImpact(request.potentialImpact());
        }
        if (request.category() != null) {
            risk.setCategory(request.category());
        }
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Risk details updated", actorId, actorName, ip, ua);
        return risk;
    }

    /** Submit the hazard analysis (computes inherent score) and move to ANALYZED. */
    @Transactional
    public Risk hazardAnalysis(Long id, HazardAnalysisRequest request,
                               Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        int inherentScore = request.severity() * request.probability();

        RiskAnalysis analysis = analysisRepository.findByRiskId(id).orElseGet(RiskAnalysis::new);
        analysis.setRiskId(id);
        analysis.setAnalysisMethod(request.analysisMethod());
        analysis.setFindings(request.findings());
        analysis.setConsequence(request.consequence());
        analysis.setSeverity(request.severity());
        analysis.setProbability(request.probability());
        analysisRepository.save(analysis);

        risk.setLikelihood(request.probability());
        risk.setRiskScore(inherentScore);
        transition(risk, RiskWorkflow.HAZARD_ANALYSIS, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "risk_score", null, String.valueOf(inherentScore),
                "Hazard analysis (" + request.analysisMethod() + "); inherent score "
                        + request.severity() + "×" + request.probability() + "=" + inherentScore,
                actorId, actorName, ip, ua);
        return risk;
    }

    /** Add a mitigation control (allowed while ANALYZED). */
    @Transactional
    public RiskMitigation addMitigation(Long id, MitigationPlanRequest request,
                                        Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        if (risk.getRiskStatus() != RiskStatus.ANALYZED) {
            throw new WorkflowException("Mitigation controls can only be planned while the risk is ANALYZED");
        }
        RiskMitigation control = new RiskMitigation();
        control.setRiskId(id);
        control.setControlDescription(request.controlDescription());
        control.setControlType(request.controlType());
        control.setOwnerId(request.ownerId());
        control.setVerificationMethod(request.verificationMethod());
        control = mitigationRepository.save(control);

        audit(id, AuditAction.UPDATE, "mitigation_control", null, request.controlType().name(),
                request.reason() != null ? request.reason() : "Mitigation control planned",
                actorId, actorName, ip, ua);
        return control;
    }

    /** Mark controls implemented (stamps implementation date) and move to MITIGATED. */
    @Transactional
    public Risk implementControls(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        List<RiskMitigation> controls = mitigationRepository.findByRiskIdOrderByIdAsc(id);
        if (controls.isEmpty()) {
            throw new WorkflowException("At least one mitigation control must be planned before implementation");
        }
        Instant now = Instant.now(clock);
        for (RiskMitigation control : controls) {
            if (control.getImplementationDate() == null) {
                control.setImplementationDate(now);
            }
        }
        risk.setSubmittedBy(actorId); // the mitigator cannot also accept the residual risk (rule 7)
        transition(risk, RiskWorkflow.IMPLEMENT_CONTROLS, v, reason, actorId, actorName, ip, ua);
        return risk;
    }

    /** Record an effectiveness verification (residual score + acceptability). Allowed while MITIGATED. */
    @Transactional
    public RiskControlEffectiveness verifyEffectiveness(Long id, VerifyEffectivenessRequest request,
                                                        Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        if (risk.getRiskStatus() != RiskStatus.MITIGATED) {
            throw new WorkflowException("Effectiveness can only be verified once the risk is MITIGATED");
        }
        RiskControlEffectiveness check = new RiskControlEffectiveness();
        check.setRiskId(id);
        check.setVerificationDate(Instant.now(clock));
        check.setVerifiedBy(actorId);
        check.setResidualRiskAcceptable(request.residualRiskAcceptable());
        check.setEvidence(request.evidence());
        check = effectivenessRepository.save(check);

        analysisRepository.findByRiskId(id).ifPresent(a -> a.setResidualRiskScore(request.residualRiskScore()));

        audit(id, AuditAction.UPDATE, "residual_risk", null,
                "score=" + request.residualRiskScore() + ", acceptable=" + request.residualRiskAcceptable(),
                request.reason() != null ? request.reason() : "Residual risk verified",
                actorId, actorName, ip, ua);
        return check;
    }

    /** Management acceptance (signature). Requires the residual risk to have been verified acceptable. */
    @Transactional
    public Risk accept(Long id, int v, String reason, String password, String totpCode,
                       boolean firstSignatureInSession, String meaningStatement,
                       Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        RiskControlEffectiveness latest = effectivenessRepository
                .findByRiskIdOrderByVerificationDateDesc(id).stream().findFirst().orElse(null);
        if (latest == null || !latest.isResidualRiskAcceptable()) {
            throw new WorkflowException("Residual risk must be verified acceptable before acceptance");
        }
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(RiskWorkflow.RECORD_TYPE).recordId(String.valueOf(risk.getId()))
                .contentHash(risk.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I accept this risk at its verified residual level.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        risk.setAcceptedBy(actorId);
        risk.setAcceptedDate(Instant.now(clock));
        transition(risk, RiskWorkflow.ACCEPT, v, reason, actorId, actorName, ip, ua);
        return risk;
    }

    @Transactional
    public Risk close(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        risk.setClosedDate(Instant.now(clock));
        transition(risk, RiskWorkflow.CLOSE, v, reason, actorId, actorName, ip, ua);
        return risk;
    }

    @Transactional
    public Risk cancel(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Risk risk = require(id);
        transition(risk, RiskWorkflow.CANCEL, v, reason, actorId, actorName, ip, ua);
        return risk;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(RiskWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals -----------------------------------------------------------------------------

    private void transition(Risk risk, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(RiskWorkflow.DEFINITION, risk,
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
                .recordType(RiskWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private Risk require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Risk not found: " + id));
    }
}
