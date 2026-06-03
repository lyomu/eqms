package com.eqms.changecontrol;

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
 * A change control record. Regulated record (optimistic locking, soft delete, audit columns).
 * Implements {@link WorkflowAware} so its status is driven through the shared WorkflowService.
 * As in {@code Document}, the typed status lives in {@code changeStatus} while the WorkflowAware
 * contract is met by the String-based {@link #getStatus()}/{@link #setStatus(String)}.
 */
@Entity
@Table(name = "change_controls")
@Getter
@Setter
@SQLDelete(sql = "UPDATE change_controls SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class ChangeControl extends RegulatedEntity implements WorkflowAware {

    @Column(name = "change_number", nullable = false, length = 40, unique = true)
    private String changeNumber;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 20)
    private ChangeType changeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ChangeControlStatus changeStatus = ChangeControlStatus.DRAFT;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @Column(name = "effectiveness_check_required", nullable = false)
    private boolean effectivenessCheckRequired = false;

    @Column(name = "target_implementation_date")
    private Instant targetImplementationDate;

    @Column(name = "implemented_date")
    private Instant implementedDate;

    @Column(name = "closed_date")
    private Instant closedDate;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- WorkflowAware ---------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "ChangeControl";
    }

    @Override
    @Transient
    public String getStatus() {
        return changeStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.changeStatus = ChangeControlStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (title == null ? "" : title) + "|"
                        + (description == null ? "" : description) + "|"
                        + (changeType == null ? "" : changeType.name()));
    }
}
