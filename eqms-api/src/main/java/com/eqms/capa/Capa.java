package com.eqms.capa;

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
 * A CAPA (Corrective and Preventive Action) record. Regulated record; implements {@link WorkflowAware}
 * so its status is driven through the shared WorkflowService. Corrective/preventive action items are
 * held in the separate {@code capa_actions} table ({@link CapaAction}).
 */
@Entity
@Table(name = "capas")
@Getter
@Setter
@SQLDelete(sql = "UPDATE capas SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Capa extends RegulatedEntity implements WorkflowAware {

    @Column(name = "capa_number", nullable = false, length = 40, unique = true)
    private String capaNumber;

    @Column(name = "title", nullable = false, length = 400)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 40)
    private CapaSource source;

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private CapaStatus capaStatus = CapaStatus.DRAFT;

    @Column(name = "effectiveness_check_required", nullable = false)
    private boolean effectivenessCheckRequired = false;

    @Column(name = "effectiveness_check_result", columnDefinition = "text")
    private String effectivenessCheckResult;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "closed_date")
    private Instant closedDate;

    @Column(name = "submitted_by")
    private Long submittedBy;

    // --- WorkflowAware ---------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Capa";
    }

    @Override
    @Transient
    public String getStatus() {
        return capaStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.capaStatus = CapaStatus.valueOf(status);
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
