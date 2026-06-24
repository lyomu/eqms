package com.eqms.audits;

import java.time.Instant;

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
@Table(name = "audit_evidence")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_type", nullable = false, length = 30)
    private AuditEvidenceType evidenceType;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(name = "area_audited", length = 200)
    private String areaAudited;

    @Column(name = "person_interviewed", length = 200)
    private String personInterviewed;

    @Column(name = "records_reviewed", columnDefinition = "text")
    private String recordsReviewed;

    @Column(name = "related_checklist_item_id")
    private Long relatedChecklistItemId;

    @Column(name = "related_finding_id")
    private Long relatedFindingId;

    @Column(name = "auditor_notes", columnDefinition = "text")
    private String auditorNotes;

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
