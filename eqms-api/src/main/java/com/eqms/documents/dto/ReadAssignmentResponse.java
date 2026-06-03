package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.documents.DocumentReadAssignment;

public record ReadAssignmentResponse(
        Long id,
        Long documentId,
        Long assignedTo,
        Instant assignedAt,
        Long assignedBy,
        Instant acknowledgedAt
) {
    public static ReadAssignmentResponse from(DocumentReadAssignment a) {
        return new ReadAssignmentResponse(
                a.getId(), a.getDocumentId(), a.getAssignedTo(),
                a.getAssignedAt(), a.getAssignedBy(), a.getAcknowledgedAt());
    }
}
