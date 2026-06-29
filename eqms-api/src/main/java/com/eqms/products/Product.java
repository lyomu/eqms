package com.eqms.products;

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
 * A product (master data). Regulated record; implements {@link WorkflowAware} so its status is
 * driven through the shared WorkflowService. A product becomes ACTIVE only after an approval signature.
 */
@Entity
@Table(name = "products")
@Getter
@Setter
@SQLDelete(sql = "UPDATE products SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Product extends RegulatedEntity implements WorkflowAware {

    @Column(name = "product_code", nullable = false, length = 40, unique = true)
    private String productCode;

    @Column(name = "name", nullable = false, length = 400)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "dosage_form", nullable = false, length = 40)
    private DosageForm dosageForm;

    @Column(name = "strength", length = 100)
    private String strength;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "product_type", length = 60)
    private String productType;

    @Column(name = "category", length = 160)
    private String category;

    @Column(name = "intended_use", columnDefinition = "text")
    private String intendedUse;

    @Enumerated(EnumType.STRING)
    @Column(name = "criticality", nullable = false, length = 20)
    private ProductCriticality criticality = ProductCriticality.MINOR;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "department", length = 160)
    private String department;

    @Column(name = "site_location", length = 160)
    private String siteLocation;

    @Column(name = "revision", nullable = false, length = 40)
    private String revision = "A";

    @Column(name = "specification_reference", length = 160)
    private String specificationReference;

    @Column(name = "specification_status", nullable = false, length = 40)
    private String specificationStatus = "DRAFT";

    @Column(name = "storage_requirements", columnDefinition = "text")
    private String storageRequirements;

    @Column(name = "shelf_life", length = 120)
    private String shelfLife;

    @Column(name = "expiry_required", nullable = false)
    private boolean expiryRequired;

    @Column(name = "qc_testing_required", nullable = false)
    private boolean qcTestingRequired;

    @Column(name = "batch_lot_tracking_required", nullable = false)
    private boolean batchLotTrackingRequired;

    @Column(name = "regulatory_customer_requirements", columnDefinition = "text")
    private String regulatoryCustomerRequirements;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private java.time.Instant approvedAt;

    @Column(name = "next_review_date")
    private java.time.LocalDate nextReviewDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ProductStatus productStatus = ProductStatus.DRAFT;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- WorkflowAware ---------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Product";
    }

    @Override
    @Transient
    public String getStatus() {
        return productStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.productStatus = ProductStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (productCode == null ? "" : productCode) + "|"
                        + (name == null ? "" : name) + "|"
                        + (dosageForm == null ? "" : dosageForm.name()) + "|"
                        + (strength == null ? "" : strength) + "|"
                        + (revision == null ? "" : revision) + "|"
                        + (specificationReference == null ? "" : specificationReference));
    }
}
