package com.eqms.training.dto;

import com.eqms.training.TrainingAudience;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Define an auto-assignment rule for a training program. */
public record CreateRuleRequest(
        @NotBlank String triggerEvent,
        @NotNull TrainingAudience targetAudience,
        Integer dueWithinDays
) {
}
