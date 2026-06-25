package com.eqms.oosmanagement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

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

    @Column(name = "title", length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", length = 40)
    private OosRecordType recordType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 20)
    private OosSeverity severity;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "lab", length = 200)
    private String lab;

    @Column(name = "date_detected")
    private Instant dateDetected;

    @Column(name = "detected_by_id")
    private Long detectedById;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "qa_reviewer_id")
    private Long qaReviewerId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "product_id")
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_category", length = 40)
    private OosTestCategory testCategory;

    @Column(name = "test_name", length = 200)
    private String testName;

    @Column(name = "test_method", length = 200)
    private String testMethod;

    @Column(name = "specification_limit_min", precision = 20, scale = 6)
    private BigDecimal specificationLimitMin;

    @Column(name = "specification_limit_max", precision = 20, scale = 6)
    private BigDecimal specificationLimitMax;

    @Column(name = "specification_reference", length = 400)
    private String specificationReference;

    @Column(name = "trend_limit", length = 100)
    private String trendLimit;

    @Column(name = "reported_result", nullable = false, length = 200)
    private String reportedResult;

    @Column(name = "unit_of_measure", length = 50)
    private String unitOfMeasure;

    @Column(name = "reported_date", nullable = false)
    private Instant reportedDate;

    @Column(name = "reported_by_id")
    private Long reportedById;

    @Column(name = "reported_by_name", length = 200)
    private String reportedByName;

    @Column(name = "sample_id", length = 200)
    private String sampleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sample_type", length = 40)
    private OosSampleType sampleType;

    @Column(name = "batch_id", length = 200)
    private String batchId;

    @Column(name = "material_id")
    private Long materialId;

    @Column(name = "material_lot_id")
    private Long materialLotId;

    @Column(name = "analyst_id")
    private Long analystId;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "equipment_id", length = 200)
    private String equipmentId;

    @Column(name = "calibration_status_at_test", length = 40)
    private String calibrationStatusAtTest;

    @Column(name = "reagent_used", length = 200)
    private String reagentUsed;

    @Column(name = "reagent_lot", length = 100)
    private String reagentLot;

    @Column(name = "reference_std_lot", length = 100)
    private String referenceStdLot;

    @Column(name = "immediate_hold_required", nullable = false)
    private boolean immediateHoldRequired = false;

    @Column(name = "hold_applied", nullable = false)
    private boolean holdApplied = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "hold_applied_to", length = 40)
    private OosHoldTarget holdAppliedTo;

    @Column(name = "hold_reason", columnDefinition = "text")
    private String holdReason;

    @Column(name = "immediate_action_taken", columnDefinition = "text")
    private String immediateActionTaken;

    @Column(name = "production_impact", nullable = false)
    private boolean productionImpact = false;

    @Column(name = "released_product_impact", nullable = false)
    private boolean releasedProductImpact = false;

    @Column(name = "customer_impact", nullable = false)
    private boolean customerImpact = false;

    @Column(name = "regulatory_impact", nullable = false)
    private boolean regulatoryImpact = false;

    @Column(name = "investigation_required", nullable = false)
    private boolean investigationRequired = true;

    @Column(name = "capa_required", nullable = false)
    private boolean capaRequired = false;

    @Column(name = "retest_requested", nullable = false)
    private boolean retestRequested = false;

    @Column(name = "resample_requested", nullable = false)
    private boolean resampleRequested = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "qa_decision", length = 40)
    private OosQaDecision qaDecision;

    @Column(name = "closure_comments", columnDefinition = "text")
    private String closureComments;

    @Column(name = "closed_by_id")
    private Long closedById;

    @Column(name = "closed_date")
    private Instant closedDate;

    @Column(name = "reopened_by_id")
    private Long reopenedById;

    @Column(name = "reopened_at")
    private Instant reopenedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private OosStatus oosStatus = OosStatus.REPORTED;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "OosCase";
    }

    /** Returns the OosRecordType classification field (distinct from WorkflowAware.getRecordType()). */
    public OosRecordType getRecordTypeField() {
        return recordType;
    }

    public void setRecordTypeField(OosRecordType value) {
        this.recordType = value;
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
