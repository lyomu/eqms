package com.eqms.deviations;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One-per-deviation impact assessment record. Not a regulated entity (no soft-delete needed). */
@Entity
@Table(name = "deviation_impact_assessments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviationImpactAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "deviation_id", nullable = false, unique = true)
    private Long deviationId;

    // Quality impact
    @Enumerated(EnumType.STRING)
    @Column(name = "product_quality_affected", length = 10)
    private ImpactValue productQualityAffected;

    @Enumerated(EnumType.STRING)
    @Column(name = "material_quality_affected", length = 10)
    private ImpactValue materialQualityAffected;

    @Enumerated(EnumType.STRING)
    @Column(name = "process_quality_affected", length = 10)
    private ImpactValue processQualityAffected;

    @Enumerated(EnumType.STRING)
    @Column(name = "specification_impact", length = 10)
    private ImpactValue specificationImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "batch_lot_impact", length = 10)
    private ImpactValue batchLotImpact;

    @Column(name = "quality_comments", columnDefinition = "TEXT")
    private String qualityComments;

    // Safety impact
    @Enumerated(EnumType.STRING)
    @Column(name = "customer_impact", length = 10)
    private ImpactValue customerImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "patient_safety_impact", length = 10)
    private ImpactValue patientSafetyImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "complaint_risk", length = 10)
    private ImpactValue complaintRisk;

    @Enumerated(EnumType.STRING)
    @Column(name = "recall_risk", length = 10)
    private ImpactValue recallRisk;

    @Column(name = "safety_comments", columnDefinition = "TEXT")
    private String safetyComments;

    // Regulatory impact
    @Enumerated(EnumType.STRING)
    @Column(name = "regulatory_impact", length = 10)
    private ImpactValue regulatoryImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "reportable_event", length = 10)
    private ImpactValue reportableEvent;

    @Enumerated(EnumType.STRING)
    @Column(name = "inspection_audit_impact", length = 10)
    private ImpactValue inspectionAuditImpact;

    @Column(name = "compliance_comments", columnDefinition = "TEXT")
    private String complianceComments;

    // Data integrity impact
    @Enumerated(EnumType.STRING)
    @Column(name = "original_record_affected", length = 10)
    private ImpactValue originalRecordAffected;

    @Enumerated(EnumType.STRING)
    @Column(name = "missing_incomplete_data", length = 10)
    private ImpactValue missingIncompleteData;

    @Enumerated(EnumType.STRING)
    @Column(name = "unauthorized_change", length = 10)
    private ImpactValue unauthorizedChange;

    @Enumerated(EnumType.STRING)
    @Column(name = "traceability_affected", length = 10)
    private ImpactValue traceabilityAffected;

    @Column(name = "data_integrity_comments", columnDefinition = "TEXT")
    private String dataIntegrityComments;

    // Overall
    @Enumerated(EnumType.STRING)
    @Column(name = "overall_impact", length = 20)
    private OverallImpact overallImpact;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_status", nullable = false, length = 30)
    private ImpactAssessmentStatus assessmentStatus;

    @Column(name = "assessed_by_id")
    private Long assessedById;

    @Column(name = "assessment_date")
    private Instant assessmentDate;

    @Column(name = "conclusion", columnDefinition = "TEXT")
    private String conclusion;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
