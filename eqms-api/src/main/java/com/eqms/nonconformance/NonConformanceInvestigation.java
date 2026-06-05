package com.eqms.nonconformance;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "non_conformance_investigation")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class NonConformanceInvestigation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nc_id", nullable = false, unique = true)
    private Long ncId;

    @Column(name = "investigation_findings", columnDefinition = "text")
    private String investigationFindings;

    @Column(name = "root_cause", columnDefinition = "text")
    private String rootCause;

    @Column(name = "investigator_id")
    private Long investigatorId;

    @Column(name = "investigation_date")
    private Instant investigationDate;

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
