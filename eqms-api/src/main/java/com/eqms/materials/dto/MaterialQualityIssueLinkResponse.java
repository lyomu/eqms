package com.eqms.materials.dto;

import java.time.Instant;

import com.eqms.materials.MaterialQualityIssueLink;

public record MaterialQualityIssueLinkResponse(
        Long id,
        Long materialId,
        Long materialLotId,
        String recordType,
        String recordId,
        String recordReference,
        String recordTitle,
        String recordStatus,
        String notes,
        Instant createdAt,
        Long createdBy
) {
    public static MaterialQualityIssueLinkResponse from(MaterialQualityIssueLink l) {
        return new MaterialQualityIssueLinkResponse(
                l.getId(), l.getMaterialId(), l.getMaterialLotId(),
                l.getRecordType() != null ? l.getRecordType().name() : null,
                l.getRecordId(), l.getRecordReference(), l.getRecordTitle(),
                l.getRecordStatus(), l.getNotes(), l.getCreatedAt(), l.getCreatedBy());
    }
}
