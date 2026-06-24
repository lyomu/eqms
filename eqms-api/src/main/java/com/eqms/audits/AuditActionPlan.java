package com.eqms.audits;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
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
@Table(name = "audit_action_plans")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditActionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "finding_id")
    private Long findingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 30)
    private ActionPlanType actionType;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "root_cause_analysis", columnDefinition = "text")
    private String rootCauseAnalysis;

    @Column(name = "action_owner_id")
    private Long actionOwnerId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "priority", length = 20)
    private String priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ActionPlanStatus status = ActionPlanStatus.NOT_STARTED;

    @Column(name = "completion_evidence", columnDefinition = "text")
    private String completionEvidence;

    @Column(name = "completed_by_id")
    private Long completedById;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(name = "verified_by_id")
    private Long verifiedById;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "effectiveness_check_required", nullable = false)
    private boolean effectivenessCheckRequired = false;

    @Column(name = "effectiveness_check_date")
    private LocalDate effectivenessCheckDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "effectiveness_result", length = 30)
    private EffectivenessResult effectivenessResult;

    @Column(name = "comments", columnDefinition = "text")
    private String comments;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private Long updatedBy;
}
