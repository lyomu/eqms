package com.eqms.batchrecords;

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
 * Immutable QC test result linked to a batch. Test results are append-only — no in-place editing
 * (Part 11 requirement). An OOS result should trigger an OOS case in M17.
 */
@Entity
@Table(name = "batch_qc_results")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class BatchQcResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_record_id", nullable = false)
    private Long batchRecordId;

    @Column(name = "test_method", nullable = false, length = 200)
    private String testMethod;

    @Column(name = "specification_limit", nullable = false, length = 200)
    private String specificationLimit;

    @Column(name = "actual_result", nullable = false, length = 200)
    private String actualResult;

    @Column(name = "test_date", nullable = false)
    private Instant testDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_status", nullable = false, length = 10)
    private QcTestStatus testStatus;

    @Column(name = "test_lab", length = 200)
    private String testLab;

    @Column(name = "approved_by")
    private Long approvedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
