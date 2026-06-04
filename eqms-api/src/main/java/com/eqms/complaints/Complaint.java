package com.eqms.complaints;

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
 * A product complaint. Regulated record; implements {@link WorkflowAware} so its status is driven
 * through the shared WorkflowService. Acknowledgment and closure both require an electronic
 * signature; the investigation and resolution live in their own child tables.
 */
@Entity
@Table(name = "complaints")
@Getter
@Setter
@SQLDelete(sql = "UPDATE complaints SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Complaint extends RegulatedEntity implements WorkflowAware {

    @Column(name = "complaint_no", nullable = false, length = 40, unique = true)
    private String complaintNo;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "complaint_description", nullable = false, columnDefinition = "text")
    private String complaintDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private ComplaintSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private ComplaintSeverity severity;

    @Column(name = "reported_date")
    private Instant reportedDate;

    @Column(name = "reported_by", length = 200)
    private String reportedBy;

    @Column(name = "owner_id")
    private Long ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ComplaintStatus complaintStatus = ComplaintStatus.OPEN;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "closed_date")
    private Instant closedDate;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Complaint";
    }

    @Override
    @Transient
    public String getStatus() {
        return complaintStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.complaintStatus = ComplaintStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (complaintNo == null ? "" : complaintNo) + "|"
                        + (productId == null ? "" : productId.toString()) + "|"
                        + (source == null ? "" : source.name()) + "|"
                        + (severity == null ? "" : severity.name()) + "|"
                        + (complaintDescription == null ? "" : complaintDescription));
    }
}
