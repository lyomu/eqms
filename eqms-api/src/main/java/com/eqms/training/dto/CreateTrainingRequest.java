package com.eqms.training.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.training.TrainingAudience;
import com.eqms.training.TrainingFrequency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTrainingRequest(
        @NotBlank String title,
        @NotBlank String content,
        @NotNull TrainingAudience intendedAudience,
        @NotNull TrainingFrequency requiredFrequency,
        String numbering,
        String trainingType,
        String occurrence,
        Instant startAt,
        Instant endAt,
        Instant completionTargetAt,
        String releaseMode,
        Instant releaseAt,
        String mainTrainerName,
        List<String> additionalTrainers,
        List<String> internalDocuments,
        String learningObjectives,
        String assessmentCriteria,
        List<TrainingSessionRequest> sessions
) {
    public record TrainingSessionRequest(int sessionIndex, Instant startAt, Instant endAt) {
    }
}
