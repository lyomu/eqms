package com.eqms.deviations.dto;

import java.time.Instant;

import com.eqms.deviations.ImpactAssessmentStatus;
import com.eqms.deviations.ImpactValue;
import com.eqms.deviations.OverallImpact;

public record UpsertImpactAssessmentRequest(
        // Quality impact
        ImpactValue productQualityAffected,
        ImpactValue materialQualityAffected,
        ImpactValue processQualityAffected,
        ImpactValue specificationImpact,
        ImpactValue batchLotImpact,
        String qualityComments,
        // Safety impact
        ImpactValue customerImpact,
        ImpactValue patientSafetyImpact,
        ImpactValue complaintRisk,
        ImpactValue recallRisk,
        String safetyComments,
        // Regulatory
        ImpactValue regulatoryImpact,
        ImpactValue reportableEvent,
        ImpactValue inspectionAuditImpact,
        String complianceComments,
        // Data integrity
        ImpactValue originalRecordAffected,
        ImpactValue missingIncompleteData,
        ImpactValue unauthorizedChange,
        ImpactValue traceabilityAffected,
        String dataIntegrityComments,
        // Overall
        OverallImpact overallImpact,
        ImpactAssessmentStatus assessmentStatus,
        Long assessedById,
        Instant assessmentDate,
        String conclusion
) {
}
