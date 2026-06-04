package com.eqms.complaints;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
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

/** The resolution record for a complaint (one per complaint), created when it is resolved. */
@Entity
@Table(name = "complaint_resolution")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class ComplaintResolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false, unique = true)
    private Long complaintId;

    @Column(name = "resolution_description", nullable = false, columnDefinition = "text")
    private String resolutionDescription;

    @Column(name = "resolution_date")
    private Instant resolutionDate;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
