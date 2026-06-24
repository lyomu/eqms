package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateChecklistItemRequest(
        String section,
        String requirementReference,
        @NotBlank String question,
        String expectedEvidence,
        String checklistMethod,
        Long responsibleAuditorId,
        Boolean applicable,
        Integer sortOrder
) {
}
