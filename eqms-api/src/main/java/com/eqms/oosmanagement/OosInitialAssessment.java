package com.eqms.oosmanagement;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "oos_initial_assessment")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosInitialAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false, unique = true)
    private Long oosId;

    @Column(name = "assessment_findings", columnDefinition = "text")
    private String assessmentFindings;

    @Enumerated(EnumType.STRING)
    @Column(name = "likely_cause", length = 40)
    private LikelyCause likelyCause;

    @Column(name = "assessor_id")
    private Long assessorId;

    @Column(name = "assessment_date")
    private Instant assessmentDate;

    @Column(name = "lab_supervisor_id")
    private Long labSupervisorId;

    @Column(name = "lab_supervisor_review", columnDefinition = "text")
    private String labSupervisorReview;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_outcome", length = 40)
    private OosInitialAssessmentOutcome assessmentOutcome;

    @Column(name = "lab_error_description", columnDefinition = "text")
    private String labErrorDescription;

    @Column(name = "assessment_started_date")
    private Instant assessmentStartedDate;

    @Column(name = "assessment_completed_date")
    private Instant assessmentCompletedDate;

    @Column(name = "assessment_comments", columnDefinition = "text")
    private String assessmentComments;

    @Column(name = "lab_error_suspected")
    private Boolean labErrorSuspected = false;

    // Checklist items
    @Column(name = "correct_sample_tested")
    private Boolean correctSampleTested;

    @Column(name = "correct_test_method_used")
    private Boolean correctTestMethodUsed;

    @Column(name = "correct_specification_applied")
    private Boolean correctSpecificationApplied;

    @Column(name = "calculations_checked")
    private Boolean calculationsChecked;

    @Column(name = "dilutions_checked")
    private Boolean dilutionsChecked;

    @Column(name = "system_suitability_checked")
    private Boolean systemSuitabilityChecked;

    @Column(name = "instrument_calibration_valid")
    private Boolean instrumentCalibrationValid;

    @Column(name = "instrument_performance_acceptable")
    private Boolean instrumentPerformanceAcceptable;

    @Column(name = "reagents_standards_valid")
    private Boolean reagentsStandardsValid;

    @Column(name = "analyst_followed_procedure")
    private Boolean analystFollowedProcedure;

    @Column(name = "environmental_conditions_acceptable")
    private Boolean environmentalConditionsAcceptable;

    @Column(name = "sample_preparation_checked")
    private Boolean samplePreparationChecked;

    @Column(name = "raw_data_reviewed")
    private Boolean rawDataReviewed;

    @Column(name = "transcription_checked")
    private Boolean transcriptionChecked;

    @Column(name = "previous_results_reviewed")
    private Boolean previousResultsReviewed;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
