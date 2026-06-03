package com.eqms.identity;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A granular permission, e.g. {@code DOCUMENT_APPROVE}. Assigned to roles via
 *  {@code role_permissions}. Enforced backend-side in Milestone 1 (CLAUDE.md rule 8). */
@Entity
@Table(name = "permissions")
@Getter
@Setter
@SQLDelete(sql = "UPDATE permissions SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Permission extends RegulatedEntity {

    @Column(name = "code", nullable = false, length = 80, unique = true)
    private String code;

    @Column(name = "description", length = 400)
    private String description;
}
