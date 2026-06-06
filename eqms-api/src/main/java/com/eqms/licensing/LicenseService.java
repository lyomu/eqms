package com.eqms.licensing;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LicenseService {

    private final JdbcTemplate jdbc;

    public LicenseService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public boolean isOrganizationActive(Long organizationId) {
        return organizationId != null && status(organizationId)
                .map(s -> s.equals("active") || s.equals("trialing"))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean hasModuleAccess(Long organizationId, String moduleCode) {
        if (organizationId == null || moduleCode == null || moduleCode.isBlank()) {
            return false;
        }
        String normalized = normalize(moduleCode);
        Boolean access = jdbc.query("""
                select exists(
                    select 1
                    from organization_module_licenses oml
                    join modules m on m.id = oml.module_id
                    where oml.organization_id = ?
                      and m.code = ?
                      and oml.enabled = true
                      and oml.status in ('trialing','active','past_due','expired')
                      and (oml.expires_at is null or oml.expires_at > now() or oml.status = 'expired')
                      and oml.deleted_at is null
                      and m.deleted_at is null
                )
                """, rs -> rs.next() && rs.getBoolean(1), organizationId, normalized);
        return Boolean.TRUE.equals(access);
    }

    @Transactional(readOnly = true)
    public boolean canCreateRecord(Long organizationId, String moduleCode) {
        return isOrganizationActive(organizationId)
                && hasModuleAccess(organizationId, moduleCode)
                && !isExpired(organizationId);
    }

    @Transactional(readOnly = true)
    public boolean canAddUser(Long organizationId) {
        return isOrganizationActive(organizationId) && isWithinUserLimit(organizationId);
    }

    @Transactional(readOnly = true)
    public boolean isWithinUserLimit(Long organizationId) {
        if (organizationId == null) {
            return false;
        }
        Integer limit = jdbc.query("""
                select user_limit
                from organization_licenses
                where organization_id = ? and deleted_at is null
                order by created_at desc
                limit 1
                """, rs -> rs.next() ? (Integer) rs.getObject("user_limit") : null, organizationId);
        if (limit == null) {
            return true;
        }
        Integer count = jdbc.query("""
                select count(*)
                from users
                where organization_id = ?
                  and status = 'ACTIVE'
                  and deleted_at is null
                """, rs -> rs.next() ? rs.getInt(1) : 0, organizationId);
        return count == null || count < limit;
    }

    @Transactional(readOnly = true)
    public boolean isExpired(Long organizationId) {
        if (organizationId == null) {
            return true;
        }
        return license(organizationId)
                .map(l -> l.status().equals("expired")
                        || l.status().equals("past_due")
                        || (l.expiresAt() != null && l.expiresAt().isBefore(OffsetDateTime.now())))
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean isSuspended(Long organizationId) {
        return organizationId == null || status(organizationId)
                .map(s -> s.equals("suspended") || s.equals("cancelled"))
                .orElse(true);
    }

    private Optional<String> status(Long organizationId) {
        return Optional.ofNullable(jdbc.query("""
                select status
                from organizations
                where id = ? and deleted_at is null
                """, rs -> rs.next() ? rs.getString("status") : null, organizationId))
                .map(s -> s.toLowerCase(Locale.ROOT));
    }

    private Optional<LicenseSnapshot> license(Long organizationId) {
        return Optional.ofNullable(jdbc.query("""
                select status, expires_at
                from organization_licenses
                where organization_id = ? and deleted_at is null
                order by created_at desc
                limit 1
                """, rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    return new LicenseSnapshot(
                            rs.getString("status").toLowerCase(Locale.ROOT),
                            rs.getObject("expires_at", OffsetDateTime.class));
                }, organizationId));
    }

    private static String normalize(String moduleCode) {
        return moduleCode.trim().replace('-', '_').toLowerCase(Locale.ROOT);
    }

    private record LicenseSnapshot(String status, OffsetDateTime expiresAt) {
    }
}
