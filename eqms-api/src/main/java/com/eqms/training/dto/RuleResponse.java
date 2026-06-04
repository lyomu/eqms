package com.eqms.training.dto;

import java.time.Instant;

import com.eqms.training.TrainingAutoRule;

public record RuleResponse(
        Long id,
        Long trainingProgramId,
        String triggerEvent,
        String targetAudience,
        Integer dueWithinDays,
        Instant createdAt
) {
    public static RuleResponse from(TrainingAutoRule r) {
        return new RuleResponse(r.getId(), r.getTrainingProgramId(), r.getTriggerEvent(),
                r.getTargetAudience().name(), r.getDueWithinDays(), r.getCreatedAt());
    }
}
