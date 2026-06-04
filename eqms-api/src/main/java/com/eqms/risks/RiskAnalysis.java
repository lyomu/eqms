package com.eqms.risks;

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

/**
 * The hazard analysis for a risk (one per risk). Records the methodology, severity/probability used
 * to compute the inherent score, and — after mitigation is verified — the residual risk score.
 */
@Entity
@Table(name = "risk_analysis")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class RiskAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "risk_id", nullable = false, unique = true)
    private Long riskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_method", nullable = false, length = 20)
    private AnalysisMethod analysisMethod;

    @Column(name = "findings", columnDefinition = "text")
    private String findings;

    @Column(name = "consequence", columnDefinition = "text")
    private String consequence;

    @Column(name = "severity", nullable = false)
    private Integer severity;

    @Column(name = "probability", nullable = false)
    private Integer probability;

    /** Residual risk score after mitigation, set at effectiveness verification. */
    @Column(name = "residual_risk_score")
    private Integer residualRiskScore;

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
