package com.eqms.oosmanagement;

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
@Table(name = "oos_evidence")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_type", nullable = false, length = 40)
    private OosEvidenceType evidenceType;

    @Column(name = "evidence_number", nullable = false)
    private int evidenceNumber = 1;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "file_name", length = 400)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 200)
    private String contentType;

    @Column(name = "storage_key", length = 800)
    private String storageKey;

    @Column(name = "attachment_id")
    private Long attachmentId;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "submitted_date")
    private Instant submittedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_status", nullable = false, length = 30)
    private OosEvidenceStatus evidenceStatus = OosEvidenceStatus.PENDING_REVIEW;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_date")
    private Instant reviewedDate;

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
