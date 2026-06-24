package com.eqms.materials.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.eqms.materials.MaterialIssue;

public record MaterialIssueResponse(
        Long id,
        Long materialId,
        Long materialLotId,
        String issueNumber,
        BigDecimal quantityRequested,
        BigDecimal quantityIssued,
        String issuedTo,
        String department,
        String batchWorkOrderRef,
        Long requestedById,
        Long issuedById,
        LocalDate issueDate,
        String purposeOfUse,
        String usageNotes,
        Instant createdAt,
        Long createdBy
) {
    public static MaterialIssueResponse from(MaterialIssue i) {
        return new MaterialIssueResponse(
                i.getId(), i.getMaterialId(), i.getMaterialLotId(), i.getIssueNumber(),
                i.getQuantityRequested(), i.getQuantityIssued(),
                i.getIssuedTo() != null ? i.getIssuedTo().name() : null,
                i.getDepartment(), i.getBatchWorkOrderRef(),
                i.getRequestedById(), i.getIssuedById(),
                i.getIssueDate(), i.getPurposeOfUse(), i.getUsageNotes(),
                i.getCreatedAt(), i.getCreatedBy());
    }
}
