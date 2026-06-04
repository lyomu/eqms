package com.eqms.batchrecords.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public record UpdateBatchRecordRequest(
        @NotNull Integer expectedVersion,
        Instant manufacturingEndDate,
        String notes,
        String reason
) {
}
