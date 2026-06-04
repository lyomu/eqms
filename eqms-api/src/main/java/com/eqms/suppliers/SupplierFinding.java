package com.eqms.suppliers;

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

/** A quality finding against a supplier (from an audit or a performance issue). Append-only. */
@Entity
@Table(name = "supplier_findings")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class SupplierFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "finding_date", nullable = false)
    private Instant findingDate;

    @Column(name = "finding_description", nullable = false, columnDefinition = "text")
    private String findingDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private FindingSeverity severity;

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
