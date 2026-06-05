package com.eqms.oosmanagement;

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

@Entity
@Table(name = "oos_cases")
@Getter
@Setter
@SQLDelete(sql = "UPDATE oos_cases SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class OosCase extends RegulatedEntity implements WorkflowAware {

    @Column(name = "oos_no", nullable = false, length = 40, unique = true)
    private String oosNo;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "test_method", length = 200)
    private String testMethod;

    @Column(name = "specification_limit_min", precision = 20, scale = 6)
    private BigDecimal specificationLimitMin;

    @Column(name = "specification_limit_max", precision = 20, scale = 6)
    private BigDecimal specificationLimitMax;

    @Column(name = "reported_result", nullable = false, length = 200)
    private String reportedResult;

    @Column(name = "reported_date", nullable = false)
    private Instant reportedDate;

    @Column(name = "reported_by_id")
    private Long reportedById;

    @Column(name = "reported_by_name", length = 200)
    private String reportedByName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private OosStatus oosStatus = OosStatus.REPORTED;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "closed_date")
    private Instant closedDate;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "OosCase";
    }

    @Override
    @Transient
    public String getStatus() {
        return oosStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.oosStatus = OosStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (oosNo == null ? "" : oosNo) + "|"
                        + (productId == null ? "" : productId.toString()) + "|"
                        + (reportedResult == null ? "" : reportedResult) + "|"
                        + (testMethod == null ? "" : testMethod));
    }
}
