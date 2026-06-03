package com.eqms.capa;

import java.time.Instant;

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

/** A corrective or preventive action item belonging to a CAPA. Regulated child record. */
@Entity
@Table(name = "capa_actions")
@Getter
@Setter
@SQLDelete(sql = "UPDATE capa_actions SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class CapaAction extends RegulatedEntity {

    @Column(name = "capa_id", nullable = false)
    private Long capaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 20)
    private CapaActionType actionType;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "assigned_to")
    private Long assignedTo;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "completed_date")
    private Instant completedDate;

    public boolean isCompleted() {
        return completedDate != null;
    }
}
