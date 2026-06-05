package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.documents.DocumentVersion;

/** Read-only view of a document version snapshot for the Versions tab. */
public record VersionResponse(
        Long id,
        int majorVersion,
        String versionLabel,
        String status,
        String title,
        String content,
        String changeNotes,
        Long createdBy,
        String createdByName,
        Instant createdAt
) {
    public static VersionResponse from(DocumentVersion v) {
        return new VersionResponse(
                v.getId(),
                v.getMajorVersion(),
                v.getVersionLabel(),
                v.getStatus(),
                v.getTitle(),
                v.getContent(),
                v.getChangeNotes(),
                v.getCreatedBy(),
                v.getCreatedByName(),
                v.getCreatedAt());
    }
}
