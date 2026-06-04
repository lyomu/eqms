package com.eqms.risks.dto;

import com.eqms.risks.ControlType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Add a mitigation control to a risk's plan. */
public record MitigationPlanRequest(
        @NotBlank String controlDescription,
        @NotNull ControlType controlType,
        Long ownerId,
        String verificationMethod,
        String reason
) {
}
