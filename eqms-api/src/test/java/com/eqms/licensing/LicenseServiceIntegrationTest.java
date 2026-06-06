package com.eqms.licensing;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.eqms.support.AbstractIntegrationTest;

class LicenseServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    LicenseService licenses;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void activeOrganizationWithEnabledModuleCanCreateRecords() {
        Long orgId = organization("active", 10);
        enableModule(orgId, "documents", true, "active");

        assertThat(licenses.isOrganizationActive(orgId)).isTrue();
        assertThat(licenses.hasModuleAccess(orgId, "documents")).isTrue();
        assertThat(licenses.canCreateRecord(orgId, "documents")).isTrue();
    }

    @Test
    void expiredOrganizationIsReadOnlyButStillHasModuleReadAccess() {
        Long orgId = organization("expired", 10);
        license(orgId, "expired", 10);
        enableModule(orgId, "documents", true, "expired");

        assertThat(licenses.hasModuleAccess(orgId, "documents")).isTrue();
        assertThat(licenses.isExpired(orgId)).isTrue();
        assertThat(licenses.canCreateRecord(orgId, "documents")).isFalse();
    }

    @Test
    void disabledModuleBlocksModuleAccess() {
        Long orgId = organization("active", 10);
        enableModule(orgId, "training", false, "active");

        assertThat(licenses.hasModuleAccess(orgId, "training")).isFalse();
        assertThat(licenses.canCreateRecord(orgId, "training")).isFalse();
    }

    @Test
    void userLimitBlocksAdditionalUsers() {
        Long orgId = organization("active", 1);
        jdbc.update("""
                insert into users (organization_id, email, username, full_name, password_hash, mfa_enabled, status, version, created_at, updated_at)
                values (?, ?, ?, 'Licensed User', 'hash', false, 'ACTIVE', 0, now(), now())
                """, orgId, "licensed-" + UUID.randomUUID() + "@example.test", "licensed-" + UUID.randomUUID());

        assertThat(licenses.isWithinUserLimit(orgId)).isFalse();
        assertThat(licenses.canAddUser(orgId)).isFalse();
    }

    private Long organization(String status, int userLimit) {
        String code = "ORG-" + UUID.randomUUID();
        Long orgId = jdbc.queryForObject("""
                insert into organizations (code, name, status, version, created_at, updated_at)
                values (?, ?, ?, 0, now(), now())
                returning id
                """, Long.class, code, code, status);
        license(orgId, status, userLimit);
        return orgId;
    }

    private void license(Long orgId, String status, int userLimit) {
        jdbc.update("""
                insert into organization_licenses (organization_id, status, user_limit, starts_at, expires_at, version, created_at, updated_at)
                values (?, ?, ?, now(), now() + interval '30 days', 0, now(), now())
                """, orgId, status, userLimit);
    }

    private void enableModule(Long orgId, String code, boolean enabled, String status) {
        jdbc.update("""
                insert into organization_module_licenses (organization_id, module_id, enabled, status, starts_at, expires_at, version, created_at, updated_at)
                select ?, id, ?, ?, now(), now() + interval '30 days', 0, now(), now()
                from modules
                where code = ?
                on conflict (organization_id, module_id) do update
                  set enabled = excluded.enabled, status = excluded.status, updated_at = now()
                """, orgId, enabled, status, code);
    }
}
