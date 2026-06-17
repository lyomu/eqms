package com.eqms.training.dto;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import com.eqms.training.TrainingProgram;
import com.eqms.training.TrainingSession;

public record TrainingResponse(
        Long id,
        String trainingCode,
        String title,
        String content,
        String intendedAudience,
        String requiredFrequency,
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
        List<SessionResponse> sessions,
        boolean active,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt
) {
    public static TrainingResponse from(TrainingProgram p) {
        return from(p, List.of());
    }

    public static TrainingResponse from(TrainingProgram p, List<TrainingSession> sessions) {
        return new TrainingResponse(p.getId(), p.getTrainingCode(), p.getTitle(), p.getContent(),
                p.getIntendedAudience().name(), p.getRequiredFrequency().name(),
                p.getNumbering(), p.getTrainingType(), p.getOccurrence(),
                p.getStartAt(), p.getEndAt(), p.getCompletionTargetAt(),
                p.getReleaseMode(), p.getReleaseAt(), p.getMainTrainerName(),
                splitLines(p.getAdditionalTrainers()), splitLines(p.getInternalDocuments()),
                p.getLearningObjectives(), p.getAssessmentCriteria(),
                sessions.stream().map(SessionResponse::from).toList(), p.isActive(),
                p.getVersion(), p.getCreatedAt(), p.getCreatedBy(), p.getUpdatedAt());
    }

    private static List<String> splitLines(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\R")).filter(item -> !item.isBlank()).toList();
    }

    public record SessionResponse(Long id, int sessionIndex, Instant startAt, Instant endAt) {
        static SessionResponse from(TrainingSession session) {
            return new SessionResponse(session.getId(), session.getSessionIndex(), session.getStartAt(), session.getEndAt());
        }
    }
}
