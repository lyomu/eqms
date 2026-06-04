package com.eqms.materials;

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
