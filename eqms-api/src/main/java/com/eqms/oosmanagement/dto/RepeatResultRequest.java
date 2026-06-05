package com.eqms.oosmanagement.dto;

import com.eqms.oosmanagement.RepeatTestResult;

import jakarta.validation.constraints.NotNull;

public record RepeatResultRequest(
        @NotNull Integer expectedVersion,
        @NotNull RepeatTestResult repeatResult,
        String testTechnicianName,
        String notes,
        String reason
) {
}
