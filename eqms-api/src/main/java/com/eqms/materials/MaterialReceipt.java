package com.eqms.materials;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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
@Table(name = "material_receipts")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class MaterialReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "material_lot_id")
    private Long materialLotId;

    @Column(name = "receipt_number", nullable = false, length = 60, unique = true)
    private String receiptNumber;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "manufacturer", length = 200)
    private String manufacturer;

    @Column(name = "supplier_lot_number", length = 200)
    private String supplierLotNumber;

    @Column(name = "purchase_order_number", length = 100)
    private String purchaseOrderNumber;

    @Column(name = "delivery_note_number", length = 100)
    private String deliveryNoteNumber;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "date_received", nullable = false)
    private LocalDate dateReceived;

    @Column(name = "received_by_id")
    private Long receivedById;

    @Column(name = "quantity_received", nullable = false)
    private BigDecimal quantityReceived;

    @Column(name = "unit_of_measure", nullable = false, length = 20)
    private String unitOfMeasure;

    @Column(name = "number_of_containers")
    private Integer numberOfContainers;

    @Enumerated(EnumType.STRING)
    @Column(name = "container_condition", length = 30)
    private ContainerCondition containerCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_condition", length = 30)
    private TransportCondition transportCondition;

    @Column(name = "storage_condition_on_arrival", columnDefinition = "text")
    private String storageConditionOnArrival;

    @Column(name = "coa_received", nullable = false)
    private boolean coaReceived = false;

    @Column(name = "sds_received", nullable = false)
    private boolean sdsReceived = false;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "retest_date")
    private LocalDate retestDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "initial_status", length = 30)
    private LotReceiptStatus initialStatus;

    @Column(name = "receipt_notes", columnDefinition = "text")
    private String receiptNotes;

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
}
