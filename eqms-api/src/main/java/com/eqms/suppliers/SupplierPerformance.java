package com.eqms.suppliers;

import java.math.BigDecimal;
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

/** A periodic performance scorecard for a supplier. Append-only. */
@Entity
@Table(name = "supplier_performance")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class SupplierPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "assessment_period_start")
    private Instant assessmentPeriodStart;

    @Column(name = "assessment_period_end")
    private Instant assessmentPeriodEnd;

    @Column(name = "on_time_delivery_pct", precision = 5, scale = 2)
    private BigDecimal onTimeDeliveryPct;

    @Column(name = "quality_acceptance_pct", precision = 5, scale = 2)
    private BigDecimal qualityAcceptancePct;

    @Column(name = "responsiveness_rating")
    private Integer responsivenessRating;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
