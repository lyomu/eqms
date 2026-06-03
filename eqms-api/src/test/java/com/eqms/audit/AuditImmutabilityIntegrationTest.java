package com.eqms.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.eqms.support.AbstractIntegrationTest;

/**
 * Proves the two independent enforcement layers that keep the audit trail append-only and
 * signatures immutable (CLAUDE.md rules 1, 2, 4):
 *   layer 1 — the least-privilege {@code eqms_app} role lacks UPDATE/DELETE;
 *   layer 2 — a database trigger rejects UPDATE/DELETE even for a privileged role.
 *
 * These assertions are themselves validation evidence (OQ) for the compliance controls.
 * Runs against the docker-compose database; each test uses unique identifiers so it is
 * re-runnable.
 */
class AuditImmutabilityIntegrationTest extends AbstractIntegrationTest {

    private Connection ownerConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), OWNER_USER, OWNER_PASSWORD);
    }

    private Connection appConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), APP_ROLE_USER, APP_ROLE_PASSWORD);
    }

    private void seedAuditRow(Connection c, String recordId) throws SQLException {
        try (Statement st = c.createStatement()) {
            st.executeUpdate("""
                INSERT INTO audit_logs (record_type, record_id, action, user_id, user_full_name, utc_timestamp)
                VALUES ('Document', '%s', 'CREATE', 1, 'Seed User', now())
                """.formatted(recordId));
        }
    }

    @Test
    void appRoleHasInsertAndSelectButNotUpdateOrDeleteOnAuditLogs() throws SQLException {
        String recordId = "APP-" + UUID.randomUUID();
        try (Connection app = appConnection()) {
            // INSERT is allowed (the app must be able to write audit entries).
            seedAuditRow(app, recordId);

            // SELECT is allowed.
            try (Statement st = app.createStatement();
                 var rs = st.executeQuery(
                         "SELECT count(*) FROM audit_logs WHERE record_id = '" + recordId + "'")) {
                rs.next();
                assertThat(rs.getInt(1)).isEqualTo(1);
            }

            // UPDATE is denied by privilege.
            assertThatThrownBy(() -> {
                try (Statement st = app.createStatement()) {
                    st.executeUpdate(
                            "UPDATE audit_logs SET action = 'UPDATE' WHERE record_id = '" + recordId + "'");
                }
            }).isInstanceOf(SQLException.class);

            // DELETE is denied by privilege.
            assertThatThrownBy(() -> {
                try (Statement st = app.createStatement()) {
                    st.executeUpdate("DELETE FROM audit_logs WHERE record_id = '" + recordId + "'");
                }
            }).isInstanceOf(SQLException.class);
        }
    }

    @Test
    void triggerRejectsAuditMutationEvenForPrivilegedOwner() throws SQLException {
        String recordId = "OWN-" + UUID.randomUUID();
        try (Connection owner = ownerConnection()) {
            seedAuditRow(owner, recordId);

            // Even the owner (which HAS table privileges) is blocked by the immutability trigger.
            assertThatThrownBy(() -> {
                try (Statement st = owner.createStatement()) {
                    st.executeUpdate(
                            "UPDATE audit_logs SET action = 'UPDATE' WHERE record_id = '" + recordId + "'");
                }
            }).isInstanceOf(SQLException.class)
              .hasMessageContaining("append-only");

            assertThatThrownBy(() -> {
                try (Statement st = owner.createStatement()) {
                    st.executeUpdate("DELETE FROM audit_logs WHERE record_id = '" + recordId + "'");
                }
            }).isInstanceOf(SQLException.class)
              .hasMessageContaining("append-only");
        }
    }

    @Test
    void appRoleCannotHardDeleteRegulatedRecords() throws SQLException {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "deluser-" + suffix;
        String email = "del-" + suffix + "@test.io";

        try (Connection owner = ownerConnection()) {
            try (Statement st = owner.createStatement()) {
                st.executeUpdate("""
                    INSERT INTO users (email, username, full_name, password_hash, mfa_enabled,
                                       status, failed_login_attempts, version, created_at, updated_at)
                    VALUES ('%s', '%s', 'Delete Me', 'x', false, 'ACTIVE', 0, 0, now(), now())
                    """.formatted(email, username));
            }
        }
        try (Connection app = appConnection()) {
            // No DELETE privilege on regulated tables -> forces soft delete (rule 2).
            assertThatThrownBy(() -> {
                try (Statement st = app.createStatement()) {
                    st.executeUpdate("DELETE FROM users WHERE username = '" + username + "'");
                }
            }).isInstanceOf(SQLException.class);

            // But the app CAN soft-delete via UPDATE (set deleted_at).
            try (Statement st = app.createStatement()) {
                int updated = st.executeUpdate(
                        "UPDATE users SET deleted_at = now() WHERE username = '" + username + "'");
                assertThat(updated).isEqualTo(1);
            }
        }
    }

    @Test
    void electronicSignaturesAreImmutableAndMeaningIsConstrained() throws SQLException {
        String okId = "SIG-" + UUID.randomUUID();
        String badId = "SIGBAD-" + UUID.randomUUID();
        try (Connection owner = ownerConnection()) {
            try (Statement st = owner.createStatement()) {
                st.executeUpdate("""
                    INSERT INTO electronic_signatures (record_type, record_id, user_id, signer_full_name,
                        signature_meaning, meaning_statement, signed_at, hmac_sha256, hmac_key_id)
                    VALUES ('Document', '%s', 1, 'Signer One', 'Approved',
                        'Approved by Signer One', now(), repeat('a', 64), 'test-1')
                    """.formatted(okId));
            }

            // Controlled vocabulary enforced by CHECK constraint.
            assertThatThrownBy(() -> {
                try (Statement st = owner.createStatement()) {
                    st.executeUpdate("""
                        INSERT INTO electronic_signatures (record_type, record_id, user_id, signer_full_name,
                            signature_meaning, meaning_statement, signed_at, hmac_sha256, hmac_key_id)
                        VALUES ('Document', '%s', 1, 'Signer One', 'Endorsed',
                            'bad meaning', now(), repeat('a', 64), 'test-1')
                        """.formatted(badId));
                }
            }).isInstanceOf(SQLException.class);

            // Immutable: trigger rejects UPDATE.
            assertThatThrownBy(() -> {
                try (Statement st = owner.createStatement()) {
                    st.executeUpdate(
                            "UPDATE electronic_signatures SET signer_full_name = 'x' WHERE record_id = '" + okId + "'");
                }
            }).isInstanceOf(SQLException.class).hasMessageContaining("immutable");
        }
    }
}
