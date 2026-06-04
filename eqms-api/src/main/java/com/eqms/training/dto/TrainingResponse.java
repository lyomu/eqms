package com.eqms.training.dto;

import java.time.Instant;

import com.eqms.training.TrainingProgram;

public record TrainingResponse(
        Long id,
        String trainingCode,
        String title,
        String content,
        String intendedAudience,
        String requiredFrequency,
        boolean active,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt
) {
    public static TrainingResponse from(TrainingProgram p) {
        return new TrainingResponse(p.getId(), p.getTrainingCode(), p.getTitle(), p.getContent(),
                p.getIntendedAudience().name(), p.getRequiredFrequency().name(), p.isActive(),
                p.getVersion(), p.getCreatedAt(), p.getCreatedBy(), p.getUpdatedAt());
    }
}
