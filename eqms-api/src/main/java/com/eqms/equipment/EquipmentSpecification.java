package com.eqms.equipment;

import java.math.BigDecimal;
import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
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
@Table(name = "equipment_specifications")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class EquipmentSpecification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "equipment_id", nullable = false)
    private Long equipmentId;

    @Column(name = "specification_key", nullable = false, length = 200)
    private String specificationKey;

    @Column(name = "specification_value", length = 500)
    private String specificationValue;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "acceptance_range_min", precision = 20, scale = 6)
    private BigDecimal acceptanceRangeMin;

    @Column(name = "acceptance_range_max", precision = 20, scale = 6)
    private BigDecimal acceptanceRangeMax;

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
