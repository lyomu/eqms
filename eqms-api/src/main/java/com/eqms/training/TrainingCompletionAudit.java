package com.eqms.training;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** An immutable completion record for a training assignment (who completed, when, with what evidence). */
@Entity
@Table(name = "training_completion_audit")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class TrainingCompletionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_assignment_id", nullable = false)
    private Long trainingAssignmentId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "completion_date", nullable = false)
    private Instant completionDate;

    @Column(name = "completed_by", nullable = false, length = 20)
    private String completedBy;

    @Column(name = "evidence_file", length = 1000)
    private String evidenceFile;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
