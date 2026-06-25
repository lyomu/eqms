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
@Table(name = "oos_root_cause")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("deleted_at IS NULL")
public class OosRootCause {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false, unique = true)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "root_cause_category", length = 40)
    private OosRootCauseCategory rootCauseCategory;

    @Column(name = "root_cause_description", columnDefinition = "text")
    private String rootCauseDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "root_cause_method", length = 40)
    private OosRootCauseMethod rootCauseMethod;

    @Column(name = "contributing_factors", columnDefinition = "text")
    private String contributingFactors;

    @Column(name = "immediate_cause", columnDefinition = "text")
    private String immediateCause;

    @Column(name = "systematic_issue", nullable = false)
    private boolean systematicIssue = false;

    @Column(name = "recurrence_prevention", columnDefinition = "text")
    private String recurrencePrevention;

    @Column(name = "assessed_by_id")
    private Long assessedById;

    @Column(name = "assessed_date")
    private Instant assessedDate;

    @Column(name = "reviewed_by_id")
    private Long reviewedById;

    @Column(name = "reviewed_date")
    private Instant reviewedDate;

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
