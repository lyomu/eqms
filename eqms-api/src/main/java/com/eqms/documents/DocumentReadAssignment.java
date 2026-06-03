package com.eqms.documents;

import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * A "read &amp; understood" assignment: a user must read a document and acknowledge it.
 * Acknowledgement records the UTC timestamp. (Full Training-module integration is a later phase.)
 */
@Entity
@Table(name = "document_read_assignments")
@Getter
@Setter
@SQLDelete(sql = "UPDATE document_read_assignments SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class DocumentReadAssignment extends RegulatedEntity {

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "assigned_to", nullable = false)
    private Long assignedTo;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    @Column(name = "assigned_by")
    private Long assignedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    public boolean isAcknowledged() {
        return acknowledgedAt != null;
    }
}
