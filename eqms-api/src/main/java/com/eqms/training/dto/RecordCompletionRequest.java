package com.eqms.training.dto;

import jakarta.validation.constraints.NotNull;

/** Record completion of a training assignment, with evidence (test score reference, file, etc.). */
public record RecordCompletionRequest(
        @NotNull Long assignmentId,
        @NotNull Integer expectedVersion,
        String completionEvidence,
        String reason
) {
}
