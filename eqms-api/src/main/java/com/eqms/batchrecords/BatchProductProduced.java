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

/** Immutable record of a product lot produced by a batch. Supports traceability (materials in → products out). */
@Entity
@Table(name = "batch_products_produced")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class BatchProductProduced {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_record_id", nullable = false)
    private Long batchRecordId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_code", nullable = false, length = 40)
    private String productCode;

    @Column(name = "lot_number_assigned", nullable = false, length = 100)
    private String lotNumberAssigned;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit", nullable = false, length = 20)
    private String unit;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
