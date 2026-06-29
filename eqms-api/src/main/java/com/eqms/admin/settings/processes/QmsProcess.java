package com.eqms.admin.settings.processes;

import java.time.LocalDate;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "qms_processes")
@Getter
@Setter
@SQLDelete(sql = "UPDATE qms_processes SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class QmsProcess extends RegulatedEntity {

    @Column(name = "process_code", nullable = false, length = 40, unique = true)
    private String processCode;

    @Column(name = "name", nullable = false, length = 240)
    private String name;

    @Column(name = "process_owner_id")
    private Long processOwnerId;

    @Column(name = "department", length = 160)
    private String department;

    @Column(name = "purpose", columnDefinition = "text")
    private String purpose;

    @Column(name = "inputs", columnDefinition = "text")
    private String inputs;

    @Column(name = "outputs", columnDefinition = "text")
    private String outputs;

    @Column(name = "kpis", columnDefinition = "text")
    private String kpis;

    @Column(name = "linked_documents", columnDefinition = "text")
    private String linkedDocuments;

    @Column(name = "linked_risks", columnDefinition = "text")
    private String linkedRisks;

    @Column(name = "linked_training", columnDefinition = "text")
    private String linkedTraining;

    @Column(name = "records_generated", columnDefinition = "text")
    private String recordsGenerated;

    @Column(name = "review_frequency_months", nullable = false)
    private int reviewFrequencyMonths = 12;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private QmsProcessStatus status = QmsProcessStatus.DRAFT;
}
