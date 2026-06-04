package com.eqms.batchrecords;

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

/**
 * An immutable production step recorded contemporaneously during manufacturing.
 * Steps are append-only — no update or delete once recorded (Part 11 requirement).
 */
@Entity
@Table(name = "batch_production_steps")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class BatchProductionStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_record_id", nullable = false)
    private Long batchRecordId;

    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @Column(name = "step_description", nullable = false, columnDefinition = "text")
    private String stepDescription;

    @Column(name = "equipment_used", length = 200)
    private String equipmentUsed;

    @Column(name = "operator_id")
    private Long operatorId;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "parameters_recorded", columnDefinition = "text")
    private String parametersRecorded;

    @Column(name = "anomalies_noted", columnDefinition = "text")
    private String anomaliesNoted;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
