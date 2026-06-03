package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.documents.Document;

/** Document representation returned by the API (list + detail). */
public record DocumentResponse(
        Long id,
        String documentNumber,
        String title,
        String type,
        String status,
        int majorVersion,
        int version,
        String content,
        Instant effectiveDate,
        Instant nextReviewDate,
        Integer reviewPeriodMonths,
        Long supersededById,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentResponse from(Document d) {
        return new DocumentResponse(
                d.getId(),
                d.getDocumentNumber(),
                d.getTitle(),
                d.getDocumentType().name(),
                d.getDocumentStatus().name(),
                d.getMajorVersion(),
                d.getVersion(),
                d.getContent(),
                d.getEffectiveDate(),
                d.getNextReviewDate(),
                d.getReviewPeriodMonths(),
                d.getSupersededById(),
                d.getCreatedBy(),
                d.getSubmittedBy(),
                d.getCreatedAt(),
                d.getUpdatedAt());
    }
}
