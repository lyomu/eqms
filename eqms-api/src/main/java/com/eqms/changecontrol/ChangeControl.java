package com.eqms.changecontrol;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.WorkflowAware;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
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

    @Column(name = "location_name", length = 200)
    private String locationName;

    @Column(name = "purpose_of_change", length = 200)
    private String purposeOfChange;

    @Column(name = "regulatory_mandate_effective_date")
    private Instant regulatoryMandateEffectiveDate;

    @Column(name = "regulatory_mandate_source", length = 500)
    private String regulatoryMandateSource;

    @Column(name = "change_category", length = 300)
    private String changeCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false, length = 20)
    private ChangeType changeType;

    @Column(name = "related_market", length = 300)
    private String relatedMarket;

    @Column(name = "related_customer", length = 300)
    private String relatedCustomer;

    @Column(name = "vendor_code", length = 120)
    private String vendorCode;

    @Column(name = "vendor_name", length = 300)
    private String vendorName;

    @Column(name = "product_item_code", length = 120)
    private String productItemCode;

    @Column(name = "product_item_description", length = 500)
    private String productItemDescription;

    @Column(name = "equipment_id_number", length = 120)
    private String equipmentIdNumber;

    @Column(name = "equipment_name", length = 300)
    private String equipmentName;

    @Column(name = "document_name", length = 500)
    private String documentName;

    @Column(name = "document_number", length = 120)
    private String documentNumber;

    @Column(name = "current_status_brief", columnDefinition = "text")
    private String currentStatusBrief;

    @Column(name = "proposed_change_brief", columnDefinition = "text")
    private String proposedChangeBrief;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private ChangeControlStatus changeStatus = ChangeControlStatus.DRAFT;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @Column(name = "change_nature", length = 80)
    private String changeNature;

    @Column(name = "temporary_change_period", length = 500)
    private String temporaryChangePeriod;

    @Column(name = "effectiveness_check_required", nullable = false)
    private boolean effectivenessCheckRequired = false;

    @Column(name = "target_implementation_date")
    private Instant targetImplementationDate;

    @Column(name = "change_owner", length = 200)
    private String changeOwner;

    @Column(name = "change_owner_hod", length = 200)
    private String changeOwnerHod;

    @Column(name = "qa_responsible", length = 200)
    private String qaResponsible;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "change_control_departments", joinColumns = @JoinColumn(name = "change_control_id"))
    @Column(name = "department_name", length = 200)
    private Set<String> involvedDepartments = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "change_control_impact_tasks", joinColumns = @JoinColumn(name = "change_control_id"))
    @OrderColumn(name = "task_order")
    private List<ChangeImpactTask> impactTasks = new ArrayList<>();

    @Column(name = "rad_assessment_required", length = 80)
    private String radAssessmentRequired;

    @Column(name = "customer_cg_assessment_required", length = 120)
    private String customerCgAssessmentRequired;

    @Column(name = "customer_cg_comments", columnDefinition = "text")
    private String customerCgComments;

    @Column(name = "qa_assessment_by", length = 200)
    private String qaAssessmentBy;

    @Column(name = "qa_assessment_on")
    private Instant qaAssessmentOn;

    @Column(name = "internal_customer", length = 300)
    private String internalCustomer;

    @Column(name = "change_acceptance", length = 120)
    private String changeAcceptance;

    @Column(name = "qa_comment", columnDefinition = "text")
    private String qaComment;

    @Column(name = "recommendations", columnDefinition = "text")
    private String recommendations;

    @Column(name = "qp_comments", columnDefinition = "text")
    private String qpComments;

    @Column(name = "variation_classification", length = 200)
    private String variationClassification;

    @Column(name = "documents_requested_for_filing", columnDefinition = "text")
    private String documentsRequestedForFiling;

    @Column(name = "recommendation_for_release", columnDefinition = "text")
    private String recommendationForRelease;

    @Column(name = "other_recommendations", columnDefinition = "text")
    private String otherRecommendations;

    @Column(name = "rad_assessment", columnDefinition = "text")
    private String radAssessment;

    @Column(name = "other_departments_review", columnDefinition = "text")
    private String otherDepartmentsReview;

    @Column(name = "final_qa_decision", length = 200)
    private String finalQaDecision;

    @Column(name = "qa_review_date")
    private Instant qaReviewDate;

    @Column(name = "qa_reviewer", length = 200)
    private String qaReviewer;

    @Column(name = "implemented_date")
    private Instant implementedDate;

    @Column(name = "implementation_details", columnDefinition = "text")
    private String implementationDetails;

    @Column(name = "implementation_review", columnDefinition = "text")
    private String implementationReview;

    @Column(name = "action_confirmation_comment", columnDefinition = "text")
    private String actionConfirmationComment;

    @Column(name = "change_effective_date")
    private Instant changeEffectiveDate;

    @Column(name = "closure_remarks", columnDefinition = "text")
    private String closureRemarks;

    @Column(name = "batch_ar_number", length = 200)
    private String batchArNumber;

    @Column(name = "product_material_code", length = 200)
    private String productMaterialCode;

    @Column(name = "product_material_name", length = 400)
    private String productMaterialName;

    @Column(name = "closed_by_name", length = 200)
    private String closedByName;

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
                        + (changeType == null ? "" : changeType.name()) + "|"
                        + (purposeOfChange == null ? "" : purposeOfChange) + "|"
                        + (changeCategory == null ? "" : changeCategory) + "|"
                        + (currentStatusBrief == null ? "" : currentStatusBrief) + "|"
                        + (proposedChangeBrief == null ? "" : proposedChangeBrief) + "|"
                        + (justification == null ? "" : justification));
    }
}
