package com.eqms.common;

import java.time.Instant;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import com.eqms.tenant.TenantContext;

/**
 * Base class for every regulated <em>mutable</em> record. Provides the columns mandated
 * by CLAUDE.md:
 *
 * <ul>
 *   <li><b>{@code version}</b> — optimistic locking (rule 5). Hibernate rejects stale updates.</li>
 *   <li><b>{@code deleted_at}</b> — soft delete (rule 2). Concrete entities add
 *       {@code @SQLDelete} + {@code @SQLRestriction("deleted_at IS NULL")} so a "delete"
 *       only stamps this column and soft-deleted rows are filtered from queries.</li>
 *   <li><b>created/updated audit columns</b> — populated by Spring Data JPA auditing from the
 *       server UTC clock (rule 3) and the current user.</li>
 * </ul>
 *
 * <p>Append-only / immutable records (audit_logs, electronic_signatures) deliberately do NOT
 * extend this class — they must never carry update or soft-delete semantics.</p>
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@FilterDef(name = "organizationScope", parameters = @ParamDef(name = "organizationId", type = Long.class))
@Filter(name = "organizationScope", condition = "(organization_id = :organizationId or organization_id is null)")
@Getter
@Setter
public abstract class RegulatedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Owning organization. Filled from {@link TenantContext} on create for normal requests.
     * Some global/system rows may intentionally remain null.
     */
    @Column(name = "organization_id")
    private Long organizationId;

    /** Optimistic-lock counter; managed by Hibernate (rule 5). */
    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private Long updatedBy;

    /** Soft-delete marker (rule 2). Null = active; non-null = logically deleted. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    @PrePersist
    protected void assignOrganizationFromContext() {
        if (organizationId == null) {
            organizationId = TenantContext.getOrganizationId();
        }
    }
}
