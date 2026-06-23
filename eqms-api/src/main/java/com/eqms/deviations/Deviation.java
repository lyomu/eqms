package com.eqms.deviations;

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

    // --- Extended fields (v035) ------------------------------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(name = "deviation_type", length = 20)
    private DeviationType deviationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    private DeviationCategory category;

    @Column(name = "related_module", length = 30)
    private String relatedModule;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "site", length = 200)
    private String site;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "date_discovered")
    private Instant dateDiscovered;

    @Column(name = "date_reported")
    private Instant dateReported;

    @Column(name = "reported_by_id")
    private Long reportedById;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "qa_owner_id")
    private Long qaOwnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "initial_risk_level", length = 20)
    private DeviationRiskLevel initialRiskLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_severity", length = 20)
    private DeviationSeverity finalSeverity;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_risk_level", length = 20)
    private DeviationRiskLevel finalRiskLevel;

    @Column(name = "product_affected", nullable = false)
    private boolean productAffected = false;

    @Column(name = "material_affected", nullable = false)
    private boolean materialAffected = false;

    @Column(name = "batch_affected", nullable = false)
    private boolean batchAffected = false;

    @Column(name = "equipment_affected", nullable = false)
    private boolean equipmentAffected = false;

    @Column(name = "supplier_involved", nullable = false)
    private boolean supplierInvolved = false;

    @Column(name = "customer_impact_possible", nullable = false)
    private boolean customerImpactPossible = false;

    @Column(name = "regulatory_impact_possible", nullable = false)
    private boolean regulatoryImpactPossible = false;

    @Column(name = "data_integrity_impact_possible", nullable = false)
    private boolean dataIntegrityImpactPossible = false;

    @Column(name = "containment_required", nullable = false)
    private boolean containmentRequired = false;

    @Column(name = "investigation_required", nullable = false)
    private boolean investigationRequired = true;

    @Column(name = "capa_required", nullable = false)
    private boolean capaRequired = false;

    @Column(name = "change_control_required", nullable = false)
    private boolean changeControlRequired = false;

    @Column(name = "target_investigation_due_date")
    private LocalDate targetInvestigationDueDate;

    @Column(name = "target_closure_due_date")
    private LocalDate targetClosureDueDate;

    @Column(name = "what_happened", columnDefinition = "TEXT")
    private String whatHappened;

    @Column(name = "where_happened", length = 500)
    private String whereHappened;

    @Column(name = "how_detected", length = 500)
    private String howDetected;

    @Column(name = "who_involved", length = 500)
    private String whoInvolved;

    @Column(name = "reopen_reason", columnDefinition = "TEXT")
    private String reopenReason;

    @Column(name = "reopened_at")
    private Instant reopenedAt;

    @Column(name = "reopened_by_id")
    private Long reopenedById;

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
