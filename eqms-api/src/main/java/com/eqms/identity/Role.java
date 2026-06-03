package com.eqms.identity;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A security role (RBAC). Roles are linked to permissions via the explicit
 *  {@code role_permissions} join entity — never via {@code @ManyToMany} (CLAUDE.md). */
@Entity
@Table(name = "roles")
@Getter
@Setter
@SQLDelete(sql = "UPDATE roles SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Role extends RegulatedEntity {

    @Column(name = "name", nullable = false, length = 80, unique = true)
    private String name;

    @Column(name = "description", length = 400)
    private String description;

    /** System roles are seeded and protected from user deletion/rename in later milestones. */
    @Column(name = "is_system", nullable = false)
    private boolean system = false;
}
