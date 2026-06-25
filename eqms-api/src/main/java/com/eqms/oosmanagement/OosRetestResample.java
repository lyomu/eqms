package com.eqms.oosmanagement;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
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

@Entity
@Table(name = "oos_retest_resample")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosRetestResample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", nullable = false, length = 30)
    private OosRetestType testType;

    @Column(name = "test_number", nullable = false)
    private int testNumber = 1;

    @Column(name = "ordered_by_id")
    private Long orderedById;

    @Column(name = "ordered_date")
    private Instant orderedDate;

    @Column(name = "rationale", columnDefinition = "text")
    private String rationale;

    @Column(name = "sample_reference", length = 200)
    private String sampleReference;

    @Column(name = "analyst_id")
    private Long analystId;

    @Column(name = "performed_date")
    private Instant performedDate;

    @Column(name = "result", length = 200)
    private String result;

    @Column(name = "result_pass")
    private Boolean resultPass;

    @Column(name = "equipment_used", length = 200)
    private String equipmentUsed;

    @Column(name = "analyst_comments", columnDefinition = "text")
    private String analystComments;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "reviewed_date")
    private Instant reviewedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_status", nullable = false, length = 30)
    private OosRetestStatus testStatus = OosRetestStatus.PENDING;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
