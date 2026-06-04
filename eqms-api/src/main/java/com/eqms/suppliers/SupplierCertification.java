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

/** A certificate on file for a supplier (ISO 9001, GMP, etc.) with its expiry. Append-only. */
@Entity
@Table(name = "supplier_certifications")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class SupplierCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "cert_type", nullable = false, length = 80)
    private String certType;

    @Column(name = "issue_date")
    private Instant issueDate;

    @Column(name = "expiry_date")
    private Instant expiryDate;

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
