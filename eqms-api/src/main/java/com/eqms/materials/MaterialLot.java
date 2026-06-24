package com.eqms.materials;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
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
@Table(name = "material_lots")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@SQLDelete(sql = "UPDATE material_lots SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class MaterialLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "internal_lot_number", nullable = false, length = 60, unique = true)
    private String internalLotNumber;

    @Column(name = "supplier_lot_number", length = 200)
    private String supplierLotNumber;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "manufacturer", length = 200)
    private String manufacturer;

    @Column(name = "manufacturer_site", length = 200)
    private String manufacturerSite;

    @Column(name = "country_of_origin", length = 100)
    private String countryOfOrigin;

    @Column(name = "purchase_order_number", length = 100)
    private String purchaseOrderNumber;

    @Column(name = "delivery_note_number", length = 100)
    private String deliveryNoteNumber;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "received_quantity", nullable = false)
    private BigDecimal receivedQuantity;

    @Column(name = "accepted_quantity")
    private BigDecimal acceptedQuantity;

    @Column(name = "rejected_quantity")
    private BigDecimal rejectedQuantity;

    @Column(name = "remaining_quantity")
    private BigDecimal remainingQuantity;

    @Column(name = "unit_of_measure", nullable = false, length = 20)
    private String unitOfMeasure;

    @Column(name = "date_received")
    private LocalDate dateReceived;

    @Column(name = "received_by_id")
    private Long receivedById;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "retest_date")
    private LocalDate retestDate;

    @Column(name = "storage_location", length = 200)
    private String storageLocation;

    @Enumerated(EnumType.STRING)
    @Column(name = "lot_status", nullable = false, length = 30)
    private LotStatus lotStatus = LotStatus.QUARANTINED;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "released_by_id")
    private Long releasedById;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "rejected_by_id")
    private Long rejectedById;

    @Column(name = "disposed_at")
    private Instant disposedAt;

    @Column(name = "disposed_by_id")
    private Long disposedById;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "hold_reason", columnDefinition = "text")
    private String holdReason;

    @Column(name = "disposal_reason", columnDefinition = "text")
    private String disposalReason;

    @Column(name = "release_conditions", columnDefinition = "text")
    private String releaseConditions;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
