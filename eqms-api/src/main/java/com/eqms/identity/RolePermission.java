package com.eqms.identity;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Explicit role↔permission link (added in Milestone 0 per the approved design so the
 * {@code permissions} table is wired into RBAC). Not {@code @ManyToMany} — CLAUDE.md.
 */
@Entity
@Table(name = "role_permissions",
        uniqueConstraints = @UniqueConstraint(name = "uq_role_permissions_role_perm",
                columnNames = {"role_id", "permission_id"}))
@Getter
@Setter
@SQLDelete(sql = "UPDATE role_permissions SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class RolePermission extends RegulatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;
}
