package com.eqms.materials;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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
@Table(name = "material_issues")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public class MaterialIssue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "material_lot_id", nullable = false)
    private Long materialLotId;

    @Column(name = "issue_number", nullable = false, length = 60, unique = true)
    private String issueNumber;

    @Column(name = "quantity_requested")
    private BigDecimal quantityRequested;

    @Column(name = "quantity_issued", nullable = false)
    private BigDecimal quantityIssued;

    @Enumerated(EnumType.STRING)
    @Column(name = "issued_to", length = 30)
    private IssueDestination issuedTo;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "batch_work_order_ref", length = 200)
    private String batchWorkOrderRef;

    @Column(name = "requested_by_id")
    private Long requestedById;

    @Column(name = "issued_by_id")
    private Long issuedById;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "purpose_of_use", columnDefinition = "text")
    private String purposeOfUse;

    @Column(name = "usage_notes", columnDefinition = "text")
    private String usageNotes;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
