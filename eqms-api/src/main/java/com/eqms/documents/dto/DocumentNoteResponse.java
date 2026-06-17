package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.documents.DocumentNote;

public record DocumentNoteResponse(
        Long id,
        Long documentId,
        String noteType,
        String content,
        Long createdBy,
        String createdByName,
        Instant createdAt
) {
    public static DocumentNoteResponse from(DocumentNote n) {
        return new DocumentNoteResponse(
                n.getId(), n.getDocumentId(), n.getNoteType().name(),
                n.getContent(), n.getCreatedBy(), n.getCreatedByName(), n.getCreatedAt());
    }
}
