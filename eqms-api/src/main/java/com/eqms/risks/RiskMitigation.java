package com.eqms.risks;

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

/** A mitigation control for a risk. Append-only; marked implemented when controls are rolled out. */
@Entity
@Table(name = "risk_mitigation")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class RiskMitigation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "risk_id", nullable = false)
    private Long riskId;

    @Column(name = "control_description", nullable = false, columnDefinition = "text")
    private String controlDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "control_type", nullable = false, length = 20)
    private ControlType controlType;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "implementation_date")
    private Instant implementationDate;

    @Column(name = "verification_method", columnDefinition = "text")
    private String verificationMethod;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
