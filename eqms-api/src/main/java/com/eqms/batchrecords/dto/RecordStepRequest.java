package com.eqms.batchrecords.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordStepRequest(
        @NotNull Integer stepNumber,
        @NotBlank String stepDescription,
        String equipmentUsed,
        Long operatorId,
        @NotNull Instant startTime,
        Instant endTime,
        String parametersRecorded,
        String anomaliesNoted
) {
}
