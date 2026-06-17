package com.eqms.training;

import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A training program (master data). Regulated record (optimistic locking, soft delete, audit
 * columns). Unlike workflow-driven modules, a program has no status machine — its lifecycle is
 * expressed through its {@link TrainingAssignment}s.
 */
@Entity
@Table(name = "training_programs")
@Getter
@Setter
@SQLDelete(sql = "UPDATE training_programs SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class TrainingProgram extends RegulatedEntity {

    @Column(name = "training_code", nullable = false, length = 40, unique = true)
    private String trainingCode;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @Column(name = "numbering", length = 80)
    private String numbering;

    @Column(name = "training_type", length = 80)
    private String trainingType;

    @Column(name = "occurrence", length = 30)
    private String occurrence;

    @Column(name = "start_at")
    private Instant startAt;

    @Column(name = "end_at")
    private Instant endAt;

    @Column(name = "completion_target_at")
    private Instant completionTargetAt;

    @Column(name = "release_mode", length = 40)
    private String releaseMode;

    @Column(name = "release_at")
    private Instant releaseAt;

    @Column(name = "main_trainer_name", length = 200)
    private String mainTrainerName;

    @Column(name = "additional_trainers", columnDefinition = "text")
    private String additionalTrainers;

    @Column(name = "internal_documents", columnDefinition = "text")
    private String internalDocuments;

    @Column(name = "learning_objectives", columnDefinition = "text")
    private String learningObjectives;

    @Column(name = "assessment_criteria", columnDefinition = "text")
    private String assessmentCriteria;

    @Enumerated(EnumType.STRING)
    @Column(name = "intended_audience", nullable = false, length = 30)
    private TrainingAudience intendedAudience;

    @Enumerated(EnumType.STRING)
    @Column(name = "required_frequency", nullable = false, length = 20)
    private TrainingFrequency requiredFrequency;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
