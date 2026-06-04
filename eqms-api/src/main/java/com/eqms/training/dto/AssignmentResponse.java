package com.eqms.training.dto;

import java.time.Instant;

import com.eqms.training.TrainingAssignment;

public record AssignmentResponse(
        Long id,
        Long trainingProgramId,
        Long userId,
        Instant assignedDate,
        Instant dueDate,
        Instant completionDate,
        String status,
        String completionEvidence,
        int version
) {
    public static AssignmentResponse from(TrainingAssignment a) {
        return new AssignmentResponse(a.getId(), a.getTrainingProgramId(), a.getUserId(),
                a.getAssignedDate(), a.getDueDate(), a.getCompletionDate(), a.getStatus().name(),
                a.getCompletionEvidence(), a.getVersion());
    }
}
