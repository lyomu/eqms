package com.eqms.suppliers;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
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
 * A qualification assessment of a supplier (initial qualification or a periodic audit). Append-only;
 * the "audit" action records one of these with an audit assessment method.
 */
@Entity
@Table(name = "supplier_qualifications")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class SupplierQualification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "assessment_method", nullable = false, length = 80)
    private String assessmentMethod;

    @Column(name = "assessment_date", nullable = false)
    private Instant assessmentDate;

    @Column(name = "assessor", length = 200)
    private String assessor;

    @Column(name = "approval_status", length = 40)
    private String approvalStatus;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
