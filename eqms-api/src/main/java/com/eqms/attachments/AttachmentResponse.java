package com.eqms.attachments;

import java.time.Instant;

public record AttachmentResponse(
        Long id,
        String recordType,
        String recordId,
        String fileName,
        String contentType,
        long sizeBytes,
        String sha256,
        Long uploadedBy,
        Instant uploadedAt
) {
    public static AttachmentResponse from(Attachment a) {
        return new AttachmentResponse(a.getId(), a.getRecordType(), a.getRecordId(),
                a.getFileName(), a.getContentType(), a.getSizeBytes(),
                a.getSha256(), a.getUploadedBy(), a.getUploadedAt());
    }
}
