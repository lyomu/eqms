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
@Table(name = "oos_containment")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("deleted_at IS NULL")
public class OosContainment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false, unique = true)
    private Long oosId;

    @Column(name = "hold_required", nullable = false)
    private boolean holdRequired = false;

    @Column(name = "hold_type", length = 40)
    private String holdType;

    @Enumerated(EnumType.STRING)
    @Column(name = "hold_target", length = 40)
    private OosHoldTarget holdTarget;

    @Column(name = "target_reference", length = 200)
    private String targetReference;

    @Column(name = "hold_reason", columnDefinition = "text")
    private String holdReason;

    @Column(name = "hold_applied_at")
    private Instant holdAppliedAt;

    @Column(name = "hold_applied_by")
    private Long holdAppliedBy;

    @Column(name = "hold_released_at")
    private Instant holdReleasedAt;

    @Column(name = "hold_released_by")
    private Long holdReleasedBy;

    @Column(name = "immediate_actions", columnDefinition = "text")
    private String immediateActions;

    @Column(name = "notification_issued", nullable = false)
    private boolean notificationIssued = false;

    @Column(name = "regulatory_notification_required", nullable = false)
    private boolean regulatoryNotificationRequired = false;

    @Column(name = "customer_notification_required", nullable = false)
    private boolean customerNotificationRequired = false;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "containment_status", nullable = false, length = 30)
    private OosContainmentStatus containmentStatus = OosContainmentStatus.DRAFT;

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
