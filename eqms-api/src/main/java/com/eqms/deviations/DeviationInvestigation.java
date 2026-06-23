package com.eqms.deviations;

import java.time.Instant;
import java.time.LocalDate;

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

/** One-per-deviation investigation record including root cause analysis. Not a regulated entity (no soft-delete needed). */
@Entity
@Table(name = "deviation_investigations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviationInvestigation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "deviation_id", nullable = false, unique = true)
    private Long deviationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InvestigationStatus status;

    @Column(name = "investigation_owner_id")
    private Long investigationOwnerId;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completion_date")
    private Instant completionDate;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "evidence_reviewed", columnDefinition = "TEXT")
    private String evidenceReviewed;

    // Root cause
    @Enumerated(EnumType.STRING)
    @Column(name = "root_cause_category", length = 50)
    private RootCauseCategory rootCauseCategory;

    @Column(name = "root_cause_description", columnDefinition = "TEXT")
    private String rootCauseDescription;

    @Column(name = "contributing_factors", columnDefinition = "TEXT")
    private String contributingFactors;

    @Column(name = "most_probable_root_cause", columnDefinition = "TEXT")
    private String mostProbableRootCause;

    @Column(name = "root_cause_confirmed", nullable = false)
    private boolean rootCauseConfirmed = false;

    @Column(name = "analysis_method", length = 40)
    private String analysisMethod;

    @Column(name = "investigation_conclusion", columnDefinition = "TEXT")
    private String investigationConclusion;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
