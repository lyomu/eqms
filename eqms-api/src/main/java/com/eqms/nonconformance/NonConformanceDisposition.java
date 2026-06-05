package com.eqms.nonconformance;

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
@Table(name = "non_conformance_disposition")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class NonConformanceDisposition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nc_id", nullable = false, unique = true)
    private Long ncId;

    @Enumerated(EnumType.STRING)
    @Column(name = "disposition", nullable = false, length = 30)
    private NcDisposition disposition;

    @Column(name = "rationale", columnDefinition = "text")
    private String rationale;

    @Column(name = "rework_specifications", columnDefinition = "text")
    private String reworkSpecifications;

    @Column(name = "rework_completed")
    private Boolean reworkCompleted = false;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_date")
    private Instant approvedDate;

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
