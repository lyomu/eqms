package com.eqms.oosmanagement.dto;

import com.eqms.oosmanagement.LikelyCause;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InitialAssessmentRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String assessmentFindings,
        @NotNull LikelyCause likelyCause,
        String reason
) {
}
