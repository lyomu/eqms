package com.eqms.training.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

/** Compatibility request for POST /api/training/{id}/create-auto-rule. */
public record CreateAutoRuleRequest(
        @NotBlank String triggerEvent,
        @NotEmpty List<String> targetAudience,
        Integer daysUntilDue
) {
}
