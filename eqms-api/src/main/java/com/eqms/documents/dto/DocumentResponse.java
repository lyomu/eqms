package com.eqms.documents.dto;

import java.time.Instant;
import java.util.Set;

import com.eqms.documents.Document;

/** Document representation returned by the API (list + detail). */
public record DocumentResponse(
        Long id,
        String documentNumber,
        String title,
        String type,
        String status,
        int majorVersion,
        int minorVersion,
        int version,
        String content,
        Instant effectiveDate,
        Instant nextReviewDate,
        Integer reviewPeriodMonths,
        Long supersededById,
        Long createdBy,
        Long submittedBy,
        Long folderId,
        Long ownerId,
        Long approvalProfileId,
        String keywords,
        String referenceUrl,
        boolean pdfRenditionRequired,
        Set<Long> referenceDocumentIds,
        Long checkedOutBy,
        Instant checkedOutAt,
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
                d.getMinorVersion(),
                d.getVersion(),
                d.getContent(),
                d.getEffectiveDate(),
                d.getNextReviewDate(),
                d.getReviewPeriodMonths(),
                d.getSupersededById(),
                d.getCreatedBy(),
                d.getSubmittedBy(),
                d.getFolderId(),
                d.getOwnerId(),
                d.getApprovalProfileId(),
                d.getKeywords(),
                d.getReferenceUrl(),
                d.isPdfRenditionRequired(),
                Set.copyOf(d.getReferenceDocumentIds()),
                d.getCheckedOutBy(),
                d.getCheckedOutAt(),
                d.getCreatedAt(),
                d.getUpdatedAt());
    }
}
