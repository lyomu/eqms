package com.eqms.batchrecords.dto;

import jakarta.validation.constraints.NotNull;

public record RecordDeviationRequest(
        @NotNull Long deviationId,
        String reason
) {
}
