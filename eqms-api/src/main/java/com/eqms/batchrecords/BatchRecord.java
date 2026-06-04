package com.eqms.batchrecords;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.WorkflowAware;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;

/**
 * An Electronic Batch Record (eBR). Regulated record; implements {@link WorkflowAware} so its
 * status is driven through the shared WorkflowService. Once manufacturing starts the header fields
 * (product, batch size, unit) are immutable — enforced in the service layer.
 */
@Entity
@Table(name = "batch_records")
@Getter
@Setter
@SQLDelete(sql = "UPDATE batch_records SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class BatchRecord extends RegulatedEntity implements WorkflowAware {

    @Column(name = "batch_no", nullable = false, length = 40, unique = true)
    private String batchNo;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_code", nullable = false, length = 40)
    private String productCode;

    @Column(name = "batch_size", nullable = false, precision = 15, scale = 3)
    private BigDecimal batchSize;

    @Column(name = "unit", nullable = false, length = 20)
    private String unit;

    @Column(name = "manufacturing_start_date", nullable = false)
    private Instant manufacturingStartDate;

    @Column(name = "manufacturing_end_date")
    private Instant manufacturingEndDate;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private BatchStatus batchStatus = BatchStatus.IN_PROGRESS;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "released_by")
    private Long releasedBy;

    @Column(name = "released_at")
    private Instant releasedAt;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "BatchRecord";
    }

    @Override
    @Transient
    public String getStatus() {
        return batchStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.batchStatus = BatchStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (batchNo == null ? "" : batchNo) + "|"
                        + (productId == null ? "" : productId.toString()) + "|"
                        + (batchSize == null ? "" : batchSize.toPlainString()) + "|"
                        + (unit == null ? "" : unit));
    }
}
