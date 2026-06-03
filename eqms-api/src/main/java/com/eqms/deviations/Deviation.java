package com.eqms.deviations;

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
 * A deviation (departure from an approved procedure/specification). Regulated record; implements
 * {@link WorkflowAware} so status is driven through the shared WorkflowService.
 */
@Entity
@Table(name = "deviations")
@Getter
@Setter
@SQLDelete(sql = "UPDATE deviations SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Deviation extends RegulatedEntity implements WorkflowAware {

    @Column(name = "deviation_number", nullable = false, length = 40, unique = true)
    private String deviationNumber;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private DeviationSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private DeviationStatus deviationStatus = DeviationStatus.DRAFT;

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Column(name = "immediate_action", columnDefinition = "text")
    private String immediateAction;

    @Column(name = "occurred_date")
    private Instant occurredDate;

    @Column(name = "closed_date")
    private Instant closedDate;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- WorkflowAware ---------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Deviation";
    }

    @Override
    @Transient
    public String getStatus() {
        return deviationStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.deviationStatus = DeviationStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (title == null ? "" : title) + "|"
                        + (description == null ? "" : description) + "|"
                        + (rootCause == null ? "" : rootCause));
    }
}
