package com.eqms.training;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "intended_audience", nullable = false, length = 30)
    private TrainingAudience intendedAudience;

    @Enumerated(EnumType.STRING)
    @Column(name = "required_frequency", nullable = false, length = 20)
    private TrainingFrequency requiredFrequency;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
