package com.eqms.managementreview;

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
@Table(name = "review_metrics")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class ReviewMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "management_review_id", nullable = false)
    private Long managementReviewId;

    @Column(name = "metric_name", nullable = false, length = 120)
    private String metricName;

    @Column(name = "metric_value", length = 120)
    private String metricValue;

    @Column(name = "period", length = 60)
    private String period;

    @Enumerated(EnumType.STRING)
    @Column(name = "trend", length = 10)
    private MetricTrend trend;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
