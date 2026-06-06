package com.eqms.platform.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAuthService {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public PlatformAuthService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, Clock utcClock) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.clock = utcClock;
    }

    @Transactional
    public PlatformAdminPrincipal login(String email, String password) {
        PlatformAdminRecord admin = findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid platform credentials"));
        if (!admin.status().equals("ACTIVE") || !passwordEncoder.matches(password, admin.passwordHash())) {
            throw new BadCredentialsException("Invalid platform credentials");
        }
        jdbc.update("update platform_admins set last_login_at = ?, updated_at = now(), version = version + 1 where id = ?",
                Instant.now(clock), admin.id());
        return admin.toPrincipal();
    }

    @Transactional(readOnly = true)
    public Optional<PlatformAdminRecord> findByEmail(String email) {
        return Optional.ofNullable(jdbc.query("""
                select id, email, full_name, password_hash, status
                from platform_admins
                where email = ? and deleted_at is null
                """, rs -> {
                    if (!rs.next()) {
                        return null;
                    }
                    return new PlatformAdminRecord(
                            rs.getLong("id"),
                            rs.getString("email"),
                            rs.getString("full_name"),
                            rs.getString("password_hash"),
                            rs.getString("status"));
                }, email));
    }

    @Transactional
    public void createBootstrapAdmin(String email, String fullName, String rawPassword) {
        if (findByEmail(email).isPresent()) {
            return;
        }
        jdbc.update("""
                insert into platform_admins (email, full_name, password_hash, status, version, created_at, updated_at)
                values (?, ?, ?, 'ACTIVE', 0, now(), now())
                """, email, fullName, passwordEncoder.encode(rawPassword));
    }

    public Map<String, Object> me(PlatformAdminPrincipal principal) {
        return Map.of(
                "id", principal.getId(),
                "email", principal.getEmail(),
                "fullName", principal.getFullName(),
                "authorities", principal.getAuthorities().stream().map(Object::toString).toList());
    }

    public record PlatformAdminRecord(Long id, String email, String fullName, String passwordHash, String status) {
        PlatformAdminPrincipal toPrincipal() {
            return new PlatformAdminPrincipal(id, email, fullName, passwordHash, status.equals("ACTIVE"));
        }
    }
}
