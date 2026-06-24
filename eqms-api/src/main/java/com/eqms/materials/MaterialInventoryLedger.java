package com.eqms.materials;

import java.math.BigDecimal;
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

@Entity
@Table(name = "material_inventory_ledger")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class MaterialInventoryLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "material_lot_id")
    private Long materialLotId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 40)
    private LedgerTransactionType transactionType;

    @Column(name = "from_location", length = 200)
    private String fromLocation;

    @Column(name = "to_location", length = 200)
    private String toLocation;

    @Column(name = "quantity_in")
    private BigDecimal quantityIn;

    @Column(name = "quantity_out")
    private BigDecimal quantityOut;

    @Column(name = "balance")
    private BigDecimal balance;

    @Column(name = "unit_of_measure", length = 20)
    private String unitOfMeasure;

    @Column(name = "performed_by_id")
    private Long performedById;

    @Column(name = "reference_document", length = 200)
    private String referenceDocument;

    @Column(name = "related_record_type", length = 50)
    private String relatedRecordType;

    @Column(name = "related_record_id", length = 100)
    private String relatedRecordId;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    @Column(name = "transaction_at", nullable = false)
    private Instant transactionAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
