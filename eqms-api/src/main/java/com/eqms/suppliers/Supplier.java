package com.eqms.suppliers;

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
 * A supplier. Regulated record; implements {@link WorkflowAware} so its qualification status is
 * driven through the shared WorkflowService. Qualifications, certifications, performance scores,
 * and findings live in child tables. Qualifying a supplier requires a sign-off signature.
 */
@Entity
@Table(name = "suppliers")
@Getter
@Setter
@SQLDelete(sql = "UPDATE suppliers SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Supplier extends RegulatedEntity implements WorkflowAware {

    @Column(name = "supplier_code", nullable = false, length = 40, unique = true)
    private String supplierCode;

    @Column(name = "supplier_name", nullable = false, length = 400)
    private String supplierName;

    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 30)
    private SupplierType supplierType;

    @Column(name = "contact_person", length = 200)
    private String contactPerson;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 60)
    private String phone;

    @Column(name = "location", length = 400)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SupplierStatus supplierStatus = SupplierStatus.UNAPPROVED;

    @Column(name = "qualification_date")
    private Instant qualificationDate;

    @Column(name = "owner_id")
    private Long ownerId;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Supplier";
    }

    @Override
    @Transient
    public String getStatus() {
        return supplierStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.supplierStatus = SupplierStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (supplierCode == null ? "" : supplierCode) + "|"
                        + (supplierName == null ? "" : supplierName) + "|"
                        + (supplierType == null ? "" : supplierType.name()) + "|"
                        + (location == null ? "" : location));
    }
}
