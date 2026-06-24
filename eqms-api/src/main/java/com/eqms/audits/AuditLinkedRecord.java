package com.eqms.audits;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "audit_linked_records",
        uniqueConstraints = @UniqueConstraint(name = "uq_audit_linked_record", columnNames = {"audit_id", "record_type", "record_id"}))
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditLinkedRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", nullable = false, length = 30)
    private AuditLinkedRecordType recordType;

    @Column(name = "record_id", nullable = false, length = 100)
    private String recordId;

    @Column(name = "record_reference", length = 200)
    private String recordReference;

    @Column(name = "record_title", length = 400)
    private String recordTitle;

    @Column(name = "record_status", length = 100)
    private String recordStatus;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
