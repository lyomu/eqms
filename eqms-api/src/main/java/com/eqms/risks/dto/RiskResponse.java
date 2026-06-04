package com.eqms.risks.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.risks.Risk;
import com.eqms.risks.RiskAnalysis;
import com.eqms.risks.RiskControlEffectiveness;
import com.eqms.risks.RiskMitigation;

/** Detail view of a risk, including its analysis, mitigation controls, and effectiveness checks. */
public record RiskResponse(
        Long id,
        String riskNo,
        String title,
        String description,
        String category,
        String potentialImpact,
        Integer likelihood,
        Integer riskScore,
        String status,
        int version,
        Long ownerId,
        Long submittedBy,
        Long acceptedBy,
        Instant acceptedDate,
        Instant closedDate,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Analysis analysis,
        List<RiskMitigationResponse> mitigations,
        List<Effectiveness> effectivenessChecks
) {
    public record Analysis(
            String analysisMethod,
            String findings,
            String consequence,
            Integer severity,
            Integer probability,
            Integer residualRiskScore
    ) {
        static Analysis from(RiskAnalysis a) {
            return new Analysis(a.getAnalysisMethod().name(), a.getFindings(), a.getConsequence(),
                    a.getSeverity(), a.getProbability(), a.getResidualRiskScore());
        }
    }

    public record Effectiveness(
            Instant verificationDate,
            Long verifiedBy,
            boolean residualRiskAcceptable,
            String evidence
    ) {
        static Effectiveness from(RiskControlEffectiveness e) {
            return new Effectiveness(e.getVerificationDate(), e.getVerifiedBy(),
                    e.isResidualRiskAcceptable(), e.getEvidence());
        }
    }

    public static RiskResponse from(Risk r, RiskAnalysis analysis, List<RiskMitigation> mitigations,
                                    List<RiskControlEffectiveness> effectiveness) {
        return new RiskResponse(
                r.getId(), r.getRiskNo(), r.getTitle(), r.getDescription(), r.getCategory().name(),
                r.getPotentialImpact(), r.getLikelihood(), r.getRiskScore(), r.getRiskStatus().name(),
                r.getVersion(), r.getOwnerId(), r.getSubmittedBy(), r.getAcceptedBy(), r.getAcceptedDate(),
                r.getClosedDate(), r.getCreatedAt(), r.getCreatedBy(), r.getUpdatedAt(),
                analysis == null ? null : Analysis.from(analysis),
                mitigations.stream().map(RiskMitigationResponse::from).toList(),
                effectiveness.stream().map(Effectiveness::from).toList());
    }

    public static RiskResponse summary(Risk r) {
        return from(r, null, List.of(), List.of());
    }
}
