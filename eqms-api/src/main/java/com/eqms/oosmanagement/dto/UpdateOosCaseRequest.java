package com.eqms.oosmanagement.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateOosCaseRequest(
        @NotNull Integer expectedVersion,
        String testMethod,
        String reportedResult,
        String reason
) {
}
