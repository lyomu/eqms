package com.eqms.deviations.dto;

import java.time.Instant;

import com.eqms.deviations.DeviationImpactAssessment;

public record ImpactAssessmentResponse(
        Long id,
        Long deviationId,
        int version,
        // Quality impact
        String productQualityAffected,
        String materialQualityAffected,
        String processQualityAffected,
        String specificationImpact,
        String batchLotImpact,
        String qualityComments,
        // Safety impact
        String customerImpact,
        String patientSafetyImpact,
        String complaintRisk,
        String recallRisk,
        String safetyComments,
        // Regulatory
        String regulatoryImpact,
        String reportableEvent,
        String inspectionAuditImpact,
        String complianceComments,
        // Data integrity
        String originalRecordAffected,
        String missingIncompleteData,
        String unauthorizedChange,
        String traceabilityAffected,
        String dataIntegrityComments,
        // Overall
        String overallImpact,
        String assessmentStatus,
        Long assessedById,
        Instant assessmentDate,
        String conclusion,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static ImpactAssessmentResponse from(DeviationImpactAssessment a) {
        return new ImpactAssessmentResponse(
                a.getId(),
                a.getDeviationId(),
                a.getVersion(),
                name(a.getProductQualityAffected()),
                name(a.getMaterialQualityAffected()),
                name(a.getProcessQualityAffected()),
                name(a.getSpecificationImpact()),
                name(a.getBatchLotImpact()),
                a.getQualityComments(),
                name(a.getCustomerImpact()),
                name(a.getPatientSafetyImpact()),
                name(a.getComplaintRisk()),
                name(a.getRecallRisk()),
                a.getSafetyComments(),
                name(a.getRegulatoryImpact()),
                name(a.getReportableEvent()),
                name(a.getInspectionAuditImpact()),
                a.getComplianceComments(),
                name(a.getOriginalRecordAffected()),
                name(a.getMissingIncompleteData()),
                name(a.getUnauthorizedChange()),
                name(a.getTraceabilityAffected()),
                a.getDataIntegrityComments(),
                name(a.getOverallImpact()),
                name(a.getAssessmentStatus()),
                a.getAssessedById(),
                a.getAssessmentDate(),
                a.getConclusion(),
                a.getCreatedBy(),
                a.getCreatedAt(),
                a.getUpdatedAt());
    }

    private static String name(Enum<?> e) {
        return e == null ? null : e.name();
    }
}
