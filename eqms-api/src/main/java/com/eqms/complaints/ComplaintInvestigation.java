package com.eqms.complaints;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
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

/**
 * The investigation record for a complaint (one per complaint). Created when the complaint moves to
 * UNDER_INVESTIGATION; root-cause and impact fields are filled in subsequently. Field changes are
 * audited against the parent complaint's trail.
 */
@Entity
@Table(name = "complaint_investigation")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class ComplaintInvestigation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false, unique = true)
    private Long complaintId;

    @Column(name = "investigation_findings", columnDefinition = "text")
    private String investigationFindings;

    @Column(name = "investigator_id")
    private Long investigatorId;

    @Column(name = "investigation_date")
    private Instant investigationDate;

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Column(name = "root_cause_method", length = 60)
    private String rootCauseMethod;

    @Column(name = "impact_on_product", columnDefinition = "text")
    private String impactOnProduct;

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
