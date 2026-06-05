package com.eqms.managementreview;

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
@Table(name = "management_reviews")
@Getter
@Setter
@SQLDelete(sql = "UPDATE management_reviews SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class ManagementReview extends RegulatedEntity implements WorkflowAware {

    @Column(name = "review_no", nullable = false, length = 40, unique = true)
    private String reviewNo;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(name = "participants", columnDefinition = "text")
    private String participants;

    @Column(name = "scope", columnDefinition = "text")
    private String scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MrStatus mrStatus = MrStatus.SCHEDULED;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "approved_date")
    private Instant approvedDate;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "ManagementReview";
    }

    @Override
    @Transient
    public String getStatus() {
        return mrStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.mrStatus = MrStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (reviewNo == null ? "" : reviewNo) + "|"
                        + (reviewDate == null ? "" : reviewDate.toString()) + "|"
                        + (scope == null ? "" : scope) + "|"
                        + (participants == null ? "" : participants));
    }
}
