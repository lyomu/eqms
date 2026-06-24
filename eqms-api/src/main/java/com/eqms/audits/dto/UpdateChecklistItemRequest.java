package com.eqms.audits.dto;

public record UpdateChecklistItemRequest(
        String section,
        String requirementReference,
        String question,
        String expectedEvidence,
        String checklistMethod,
        Long responsibleAuditorId,
        Boolean applicable,
        String response,
        String evidenceSummary,
        Boolean findingRequired,
        Long linkedFindingId,
        String comments,
        Integer sortOrder
) {
}
