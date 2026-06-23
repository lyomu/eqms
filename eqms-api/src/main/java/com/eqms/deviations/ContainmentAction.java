package com.eqms.deviations;

import java.time.Instant;
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

/** A containment or immediate correction action for a deviation. Regulated child record. */
@Entity
@Table(name = "deviation_containment_actions")
@Getter
@Setter
@SQLDelete(sql = "UPDATE deviation_containment_actions SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class ContainmentAction extends RegulatedEntity {

    @Column(name = "deviation_id", nullable = false)
    private Long deviationId;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 40)
    private ContainmentActionType actionType;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ContainmentActionStatus status;

    @Column(name = "completion_evidence", columnDefinition = "TEXT")
    private String completionEvidence;

    @Column(name = "completion_date")
    private Instant completionDate;

    @Column(name = "verified_by_id")
    private Long verifiedById;

    @Column(name = "verification_date")
    private Instant verificationDate;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;
}
