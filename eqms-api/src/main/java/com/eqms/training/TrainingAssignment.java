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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * An assignment of a training program to a user. Regulated record (version, soft delete, audit
 * columns) — completion is a compliance event tracked with evidence. Status transitions are simple
 * field updates (no shared WorkflowService), audited in the service.
 */
@Entity
@Table(name = "training_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uq_training_assignment",
                columnNames = {"training_program_id", "user_id"}))
@Getter
@Setter
@SQLDelete(sql = "UPDATE training_assignments SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class TrainingAssignment extends RegulatedEntity {

    @Column(name = "training_program_id", nullable = false)
    private Long trainingProgramId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "assigned_date", nullable = false)
    private Instant assignedDate;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "completion_date")
    private Instant completionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AssignmentStatus status = AssignmentStatus.ASSIGNED;

    @Column(name = "completion_evidence", length = 1000)
    private String completionEvidence;
}
