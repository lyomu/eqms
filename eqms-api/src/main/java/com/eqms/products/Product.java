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
                        + (strength == null ? "" : strength));
    }
}
