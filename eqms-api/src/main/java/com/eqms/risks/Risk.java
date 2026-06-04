package com.eqms.risks;

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
 * A quality risk (ISO 31000 / ICH Q9). Regulated record; implements {@link WorkflowAware} so its
 * status is driven through the shared WorkflowService. The inherent risk score (severity × likelihood)
 * is set at hazard analysis; analysis, mitigation controls, and effectiveness checks live in child
 * tables. Management acceptance requires a sign-off signature.
 */
@Entity
@Table(name = "risks")
@Getter
@Setter
@SQLDelete(sql = "UPDATE risks SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Risk extends RegulatedEntity implements WorkflowAware {

    @Column(name = "risk_no", nullable = false, length = 40, unique = true)
    private String riskNo;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private RiskCategory category;

    @Column(name = "potential_impact", columnDefinition = "text")
    private String potentialImpact;

    /** Inherent likelihood (1–5), set at hazard analysis. */
    @Column(name = "likelihood")
    private Integer likelihood;

    /** Inherent risk score = severity × likelihood, set at hazard analysis. */
    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private RiskStatus riskStatus = RiskStatus.IDENTIFIED;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "accepted_by")
    private Long acceptedBy;

    @Column(name = "accepted_date")
    private Instant acceptedDate;

    @Column(name = "closed_date")
    private Instant closedDate;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Risk";
    }

    @Override
    @Transient
    public String getStatus() {
        return riskStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.riskStatus = RiskStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (riskNo == null ? "" : riskNo) + "|"
                        + (title == null ? "" : title) + "|"
                        + (category == null ? "" : category.name()) + "|"
                        + (potentialImpact == null ? "" : potentialImpact));
    }
}
