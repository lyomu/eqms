package com.eqms.managementreview;

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

@Entity
@Table(name = "review_decisions")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class ReviewDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "management_review_id", nullable = false)
    private Long managementReviewId;

    @Column(name = "decision_description", nullable = false, columnDefinition = "text")
    private String decisionDescription;

    @Column(name = "decision_area", length = 120)
    private String decisionArea;

    @Column(name = "impact", columnDefinition = "text")
    private String impact;

    @Column(name = "documented_by")
    private Long documentedBy;

    @Column(name = "documented_date")
    private Instant documentedDate;

    @Column(name = "signature_id")
    private Long signatureId;

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
