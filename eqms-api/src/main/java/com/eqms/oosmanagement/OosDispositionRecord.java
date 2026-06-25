package com.eqms.oosmanagement;

import java.math.BigDecimal;
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

@Entity
@Table(name = "oos_disposition")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosDispositionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false, unique = true)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposition", nullable = false, length = 30)
    private OosDispositionDecision disposition;

    @Column(name = "rationale", columnDefinition = "text")
    private String rationale;

    @Enumerated(EnumType.STRING)
    @Column(name = "qa_decision", length = 40)
    private OosQaDecision qaDecision;

    @Column(name = "final_conclusion", columnDefinition = "text")
    private String finalConclusion;

    @Column(name = "disposition_quantity", precision = 20, scale = 6)
    private BigDecimal dispositionQuantity;

    @Column(name = "affected_lots", columnDefinition = "text")
    private String affectedLots;

    @Column(name = "conditions_of_release", columnDefinition = "text")
    private String conditionsOfRelease;

    @Column(name = "closure_comments", columnDefinition = "text")
    private String closureComments;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_date")
    private Instant approvedDate;

    @Column(name = "closed_by_id")
    private Long closedById;

    @Column(name = "signature_id")
    private Long signatureId;

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
}
