package com.eqms.training;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * An auto-assignment rule: when {@code triggerEvent} occurs, the program should be (re)assigned to
 * the {@code targetAudience}. Defines the intent; the actual scheduled assignment engine is a later
 * enhancement, so rules are recorded and queryable now.
 */
@Entity
@Table(name = "training_auto_rules")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class TrainingAutoRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_program_id", nullable = false)
    private Long trainingProgramId;

    @Column(name = "trigger_event", nullable = false, length = 120)
    private String triggerEvent;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_audience", nullable = false, length = 30)
    private TrainingAudience targetAudience;

    @Column(name = "due_within_days")
    private Integer dueWithinDays;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
