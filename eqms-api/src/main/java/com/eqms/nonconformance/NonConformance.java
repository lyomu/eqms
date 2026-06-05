package com.eqms.nonconformance;

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
@Table(name = "non_conformances")
@Getter
@Setter
@SQLDelete(sql = "UPDATE non_conformances SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class NonConformance extends RegulatedEntity implements WorkflowAware {

    @Column(name = "nc_no", nullable = false, length = 40, unique = true)
    private String ncNo;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "nc_type", nullable = false, length = 20)
    private NcType ncType;

    @Column(name = "affected_item_id")
    private Long affectedItemId;

    @Column(name = "affected_item_type", length = 60)
    private String affectedItemType;

    @Column(name = "discovered_date")
    private Instant discoveredDate;

    @Column(name = "discovered_by", length = 200)
    private String discoveredBy;

    @Column(name = "owner_id")
    private Long ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private NcStatus ncStatus = NcStatus.OPEN;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "closed_date")
    private Instant closedDate;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "NonConformance";
    }

    @Override
    @Transient
    public String getStatus() {
        return ncStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.ncStatus = NcStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (ncNo == null ? "" : ncNo) + "|"
                        + (title == null ? "" : title) + "|"
                        + (ncType == null ? "" : ncType.name()) + "|"
                        + (affectedItemId == null ? "" : affectedItemId.toString()) + "|"
                        + (description == null ? "" : description));
    }
}
