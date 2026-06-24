package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateEvidenceRequest(
        @NotBlank String evidenceType,
        @NotBlank String description,
        String referenceNumber,
        String areaAudited,
        String personInterviewed,
        String recordsReviewed,
        Long relatedChecklistItemId,
        Long relatedFindingId,
        String auditorNotes
) {
}
