package com.eqms.materials.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record IssueMaterialRequest(
        @NotNull BigDecimal quantityIssued,
        String issuedTo,
        String department,
        String batchWorkOrderRef,
        @NotNull LocalDate issueDate,
        String purposeOfUse,
        String usageNotes
) {
}
