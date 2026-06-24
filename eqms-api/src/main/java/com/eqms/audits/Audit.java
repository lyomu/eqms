package com.eqms.audits;

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
 * A quality audit (internal or supplier). Regulated record; implements {@link WorkflowAware} so its
 * status is driven through the shared WorkflowService. Findings, CAPA links, and follow-up records
 * live in their own child tables. Completion (finalize) requires a sign-off signature.
 *
 * <p>Distinct from the system audit-<em>trail</em> in {@code com.eqms.audit}; this is the quality
 * Audit Management module (Milestone 12).</p>
 */
@Entity
@Table(name = "audits")
@Getter
@Setter
@SQLDelete(sql = "UPDATE audits SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Audit extends RegulatedEntity implements WorkflowAware {

    @Column(name = "audit_no", nullable = false, length = 40, unique = true)
    private String auditNo;

    @Column(name = "audit_title", nullable = false, length = 400)
    private String auditTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "audit_type", nullable = false, length = 20)
    private AuditType auditType;

    @Column(name = "audit_date")
    private Instant auditDate;

    @Column(name = "auditor_id")
    private Long auditorId;

    @Column(name = "auditee_id")
    private Long auditeeId;

    @Column(name = "scope", columnDefinition = "text")
    private String scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private AuditStatus auditStatus = AuditStatus.PLANNED;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "completed_date")
    private Instant completedDate;

    // --- enriched fields -----------------------------------------------------------------------

    @Column(name = "objective", columnDefinition = "text")
    private String objective;

    @Column(name = "criteria", columnDefinition = "text")
    private String criteria;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private AuditCategory category;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "process_area", length = 200)
    private String processArea;

    @Column(name = "site", length = 200)
    private String site;

    @Column(name = "related_module", length = 50)
    private String relatedModule;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 20)
    private AuditRiskLevel riskLevel;

    @Column(name = "planned_start_date")
    private Instant plannedStartDate;

    @Column(name = "planned_end_date")
    private Instant plannedEndDate;

    @Column(name = "actual_start_date")
    private Instant actualStartDate;

    @Column(name = "actual_end_date")
    private Instant actualEndDate;

    @Column(name = "lead_auditor_id")
    private Long leadAuditorId;

    @Column(name = "audit_team_members", columnDefinition = "text")
    private String auditTeamMembers;

    @Column(name = "auditee_owner_id")
    private Long auditeeOwnerId;

    @Column(name = "audit_sponsor_id")
    private Long auditSponsorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 20)
    private AuditMethod method;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", length = 20)
    private AuditFrequency frequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_for_audit", length = 50)
    private ReasonForAudit reasonForAudit;

    @Column(name = "previous_audit_id")
    private Long previousAuditId;

    @Column(name = "checklist_required", nullable = false)
    private boolean checklistRequired = false;

    @Column(name = "opening_meeting_required", nullable = false)
    private boolean openingMeetingRequired = false;

    @Column(name = "closing_meeting_required", nullable = false)
    private boolean closingMeetingRequired = false;

    @Column(name = "auditor_independence_confirmed", nullable = false)
    private boolean auditorIndependenceConfirmed = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "closure_status", length = 30)
    private ClosureStatus closureStatus;

    @Column(name = "closed_by_id")
    private Long closedById;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closure_comments", columnDefinition = "text")
    private String closureComments;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Audit";
    }

    @Override
    @Transient
    public String getStatus() {
        return auditStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.auditStatus = AuditStatus.valueOf(status);
    }

    @Override
    public Long getSubmittedBy() {
        return submittedBy;
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (auditNo == null ? "" : auditNo) + "|"
                        + (auditTitle == null ? "" : auditTitle) + "|"
                        + (auditType == null ? "" : auditType.name()) + "|"
                        + (scope == null ? "" : scope));
    }
}
