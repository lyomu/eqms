package com.eqms.materials;

import java.time.Instant;
import java.time.LocalDate;

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

@Entity
@Table(name = "material_supplier_links")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class MaterialSupplierLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "approved_for_material", nullable = false)
    private boolean approvedForMaterial = false;

    @Column(name = "scope_of_approval", columnDefinition = "text")
    private String scopeOfApproval;

    @Column(name = "approval_conditions", columnDefinition = "text")
    private String approvalConditions;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "review_date")
    private LocalDate reviewDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
