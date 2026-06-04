package com.eqms.training.dto;

import com.eqms.training.TrainingAudience;
import com.eqms.training.TrainingFrequency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTrainingRequest(
        @NotBlank String title,
        @NotBlank String content,
        @NotNull TrainingAudience intendedAudience,
        @NotNull TrainingFrequency requiredFrequency
) {
}
