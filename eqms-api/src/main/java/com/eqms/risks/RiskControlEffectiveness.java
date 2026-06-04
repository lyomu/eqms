package com.eqms.risks;

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

/** A verification that a risk's residual level is acceptable after controls. Append-only. */
@Entity
@Table(name = "risk_control_effectiveness")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class RiskControlEffectiveness {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "risk_id", nullable = false)
    private Long riskId;

    @Column(name = "verification_date", nullable = false)
    private Instant verificationDate;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "residual_risk_acceptable", nullable = false)
    private boolean residualRiskAcceptable;

    @Column(name = "evidence", columnDefinition = "text")
    private String evidence;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
