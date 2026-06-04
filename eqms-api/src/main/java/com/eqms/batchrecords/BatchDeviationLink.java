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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/** Links a deviation to a batch record. A deviation can only be linked once per batch. */
@Entity
@Table(name = "batch_deviations_link",
        uniqueConstraints = @UniqueConstraint(name = "uq_batch_deviation", columnNames = {"batch_record_id", "deviation_id"}))
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class BatchDeviationLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_record_id", nullable = false)
    private Long batchRecordId;

    @Column(name = "deviation_id", nullable = false)
    private Long deviationId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
