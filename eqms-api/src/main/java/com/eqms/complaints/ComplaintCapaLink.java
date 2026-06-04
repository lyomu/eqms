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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/** Links a complaint to a CAPA (created from, or attached to, the complaint). Append-only. */
@Entity
@Table(name = "complaint_capa_link",
        uniqueConstraints = @UniqueConstraint(name = "uq_complaint_capa", columnNames = {"complaint_id", "capa_id"}))
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class ComplaintCapaLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @Column(name = "capa_id", nullable = false)
    private Long capaId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
