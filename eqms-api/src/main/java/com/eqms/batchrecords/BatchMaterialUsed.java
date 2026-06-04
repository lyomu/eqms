package com.eqms.batchrecords;

import java.math.BigDecimal;
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
 * Immutable record of a material lot used in a batch. Append-only for traceability.
 */
@Entity
@Table(name = "batch_materials_used")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class BatchMaterialUsed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_record_id", nullable = false)
    private Long batchRecordId;

    @Column(name = "material_id")
    private Long materialId;

    @Column(name = "material_code", nullable = false, length = 40)
    private String materialCode;

    @Column(name = "lot_number", nullable = false, length = 100)
    private String lotNumber;

    @Column(name = "supplier", length = 200)
    private String supplier;

    @Column(name = "quantity_used", nullable = false, precision = 15, scale = 3)
    private BigDecimal quantityUsed;

    @Column(name = "unit", nullable = false, length = 20)
    private String unit;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
