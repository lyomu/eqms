package com.eqms.materials;

import java.math.BigDecimal;

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
 * A material (raw material / excipient / packaging / etc.) — master data. Regulated record;
 * implements {@link WorkflowAware} so its status is driven through the shared WorkflowService.
 * A material is approved (released for use) only after an approval signature.
 */
@Entity
@Table(name = "materials")
@Getter
@Setter
@SQLDelete(sql = "UPDATE materials SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Material extends RegulatedEntity implements WorkflowAware {

    @Column(name = "material_code", nullable = false, length = 40, unique = true)
    private String materialCode;

    @Column(name = "name", nullable = false, length = 400)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "material_type", nullable = false, length = 40)
    private MaterialType materialType;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_of_measure", nullable = false, length = 20)
    private UnitOfMeasure unitOfMeasure;

    @Column(name = "specification", columnDefinition = "text")
    private String specification;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private MaterialStatus materialStatus = MaterialStatus.DRAFT;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- Enriched fields -------------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 20)
    private MaterialCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "criticality", length = 20)
    private MaterialCriticality criticality;

    @Column(name = "intended_use", columnDefinition = "text")
    private String intendedUse;

    @Column(name = "alternative_unit_of_measure", length = 20)
    private String alternativeUnitOfMeasure;

    @Column(name = "conversion_factor")
    private BigDecimal conversionFactor;

    @Enumerated(EnumType.STRING)
    @Column(name = "grade", length = 30)
    private MaterialGrade grade;

    @Column(name = "cas_number", length = 50)
    private String casNumber;

    @Column(name = "specification_reference", length = 400)
    private String specificationReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "standard_storage_condition", length = 30)
    private StorageCondition standardStorageCondition;

    @Column(name = "qc_testing_required", nullable = false)
    private boolean qcTestingRequired = false;

    @Column(name = "sampling_required", nullable = false)
    private boolean samplingRequired = false;

    @Column(name = "coa_required", nullable = false)
    private boolean coaRequired = false;

    @Column(name = "sds_required", nullable = false)
    private boolean sdsRequired = false;

    @Column(name = "approved_supplier_required", nullable = false)
    private boolean approvedSupplierRequired = false;

    @Column(name = "expiry_date_required", nullable = false)
    private boolean expiryDateRequired = false;

    @Column(name = "retest_date_required", nullable = false)
    private boolean retestDateRequired = false;

    @Column(name = "quarantine_required_on_receipt", nullable = false)
    private boolean quarantineRequiredOnReceipt = true;

    @Column(name = "qa_release_required_before_use", nullable = false)
    private boolean qaReleaseRequiredBeforeUse = true;

    @Column(name = "risk_assessment_required", nullable = false)
    private boolean riskAssessmentRequired = false;

    @Column(name = "minimum_stock_level")
    private BigDecimal minimumStockLevel;

    @Column(name = "maximum_stock_level")
    private BigDecimal maximumStockLevel;

    @Column(name = "reorder_level")
    private BigDecimal reorderLevel;

    @Column(name = "reorder_quantity")
    private BigDecimal reorderQuantity;

    @Column(name = "fefo_required", nullable = false)
    private boolean fefoRequired = false;

    @Column(name = "fifo_required", nullable = false)
    private boolean fifoRequired = false;

    @Column(name = "default_warehouse", length = 200)
    private String defaultWarehouse;

    @Column(name = "default_storage_location", length = 200)
    private String defaultStorageLocation;

    // --- WorkflowAware ---------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Material";
    }

    @Override
    @Transient
    public String getStatus() {
        return materialStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.materialStatus = MaterialStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (materialCode == null ? "" : materialCode) + "|"
                        + (name == null ? "" : name) + "|"
                        + (materialType == null ? "" : materialType.name()) + "|"
                        + (specification == null ? "" : specification));
    }
}
