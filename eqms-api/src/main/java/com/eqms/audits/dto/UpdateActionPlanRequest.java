package com.eqms.audits.dto;

public record UpdateActionPlanRequest(
        String actionType,
        String description,
        String rootCauseAnalysis,
        Long actionOwnerId,
        String dueDate,
        String priority,
        String status,
        String completionEvidence,
        Long completedById,
        String completionDate,
        Long verifiedById,
        String verificationDate,
        Boolean effectivenessCheckRequired,
        String effectivenessCheckDate,
        String effectivenessResult,
        String comments
) {
}
