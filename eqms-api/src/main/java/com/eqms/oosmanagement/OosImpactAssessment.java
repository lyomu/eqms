package com.eqms.oosmanagement;

import java.time.Instant;

import org.hibernate.annotations.SQLRestriction;
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
@Table(name = "oos_impact_assessment")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("deleted_at IS NULL")
public class OosImpactAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false, unique = true)
    private Long oosId;

    @Column(name = "scope_of_impact", columnDefinition = "text")
    private String scopeOfImpact;

    @Column(name = "batches_potentially_affected", columnDefinition = "text")
    private String batchesPotentiallyAffected;

    @Column(name = "products_potentially_affected", columnDefinition = "text")
    private String productsPotentiallyAffected;

    @Column(name = "released_product_impact", nullable = false)
    private boolean releasedProductImpact = false;

    @Column(name = "customer_impact", nullable = false)
    private boolean customerImpact = false;

    @Column(name = "regulatory_impact", nullable = false)
    private boolean regulatoryImpact = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "patient_safety_risk", length = 20)
    private OosImpactRiskLevel patientSafetyRisk;

    @Column(name = "risk_justification", columnDefinition = "text")
    private String riskJustification;

    @Column(name = "quarantine_required", nullable = false)
    private boolean quarantineRequired = false;

    @Column(name = "recall_required", nullable = false)
    private boolean recallRequired = false;

    @Column(name = "authority_notification_required", nullable = false)
    private boolean authorityNotificationRequired = false;

    @Column(name = "authority_notified_at")
    private Instant authorityNotifiedAt;

    @Column(name = "authority_notified_by")
    private Long authorityNotifiedBy;

    @Column(name = "assessed_by_id")
    private Long assessedById;

    @Column(name = "assessed_date")
    private Instant assessedDate;

    @Column(name = "deleted_at")
    private Instant deletedAt;

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
