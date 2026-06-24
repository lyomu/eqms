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
@Table(name = "audit_checklist_items")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "section", length = 200)
    private String section;

    @Column(name = "requirement_reference", length = 400)
    private String requirementReference;

    @Column(name = "question", nullable = false, columnDefinition = "text")
    private String question;

    @Column(name = "expected_evidence", columnDefinition = "text")
    private String expectedEvidence;

    @Enumerated(EnumType.STRING)
    @Column(name = "checklist_method", length = 30)
    private ChecklistMethod checklistMethod;

    @Column(name = "responsible_auditor_id")
    private Long responsibleAuditorId;

    @Column(name = "applicable", nullable = false)
    private boolean applicable = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "response", length = 30)
    private ChecklistResponse response;

    @Column(name = "evidence_summary", columnDefinition = "text")
    private String evidenceSummary;

    @Column(name = "finding_required", nullable = false)
    private boolean findingRequired = false;

    @Column(name = "linked_finding_id")
    private Long linkedFindingId;

    @Column(name = "comments", columnDefinition = "text")
    private String comments;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

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
