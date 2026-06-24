package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateActionPlanRequest(
        Long findingId,
        @NotBlank String actionType,
        @NotBlank String description,
        String rootCauseAnalysis,
        Long actionOwnerId,
        String dueDate,
        String priority,
        Boolean effectivenessCheckRequired,
        String comments
) {
}
