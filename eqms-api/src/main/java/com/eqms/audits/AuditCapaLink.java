package com.eqms.audits;

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

/** Links an audit finding to a CAPA created to address it. Append-only. */
@Entity
@Table(name = "audit_capa_link",
        uniqueConstraints = @UniqueConstraint(name = "uq_audit_finding_capa", columnNames = {"audit_finding_id", "capa_id"}))
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditCapaLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_finding_id", nullable = false)
    private Long auditFindingId;

    @Column(name = "capa_id", nullable = false)
    private Long capaId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
