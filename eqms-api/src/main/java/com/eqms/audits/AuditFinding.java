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
import lombok.Getter;
import lombok.Setter;

/** A finding recorded during an audit. Append-only; CAPAs may be created from it. */
@Entity
@Table(name = "audit_findings")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Column(name = "finding_number", nullable = false)
    private Integer findingNumber;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "area", length = 200)
    private String area;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private FindingSeverity severity;

    @Column(name = "evidence", columnDefinition = "text")
    private String evidence;

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Column(name = "corrective_action_required", nullable = false)
    private boolean correctiveActionRequired = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
