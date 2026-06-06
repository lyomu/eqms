package com.eqms.admin.settings;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.auth.UserPrincipal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OrganizationAdminSettingsService {

    private static final List<String> MODULES = List.of(
            "documents", "training", "change_control", "deviations", "capa", "complaints",
            "audits", "risk", "equipment", "suppliers", "materials", "products",
            "batch_records", "oos", "non_conformance", "management_review", "reports");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public OrganizationAdminSettingsService(JdbcTemplate jdbc, ObjectMapper objectMapper, Clock utcClock) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.clock = utcClock;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> section(UserPrincipal principal, String section) {
        return readSection(principal.getOrganizationId(), section, defaults(section));
    }

    @Transactional
    public Map<String, Object> updateSection(UserPrincipal principal, String section, Map<String, Object> settings,
                                             String ipAddress, String userAgent) {
        validate(section, settings);
        Long orgId = principal.getOrganizationId();
        Map<String, Object> old = readSection(orgId, section, defaults(section));
        upsertSection(orgId, section, settings, principal.getId());
        audit(orgId, section, "UPDATE", old, settings, "Organization admin settings updated",
                principal, ipAddress, userAgent);
        return settings;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> license(UserPrincipal principal) {
        return jdbc.queryForMap("""
                select o.id as "organizationId", o.name as "organizationName", o.status,
                       p.name as "planName", l.status as "licenseStatus",
                       l.user_limit as "userLimit", l.site_limit as "siteLimit",
                       l.expires_at as "expiresAt",
                       (select count(*) from users u where u.organization_id = o.id and u.deleted_at is null) as "userCount"
                from organizations o
                left join organization_licenses l on l.organization_id = o.id and l.deleted_at is null
                left join organization_subscriptions s on s.organization_id = o.id and s.deleted_at is null
                left join plans p on p.id = s.plan_id
                where o.id = ?
                """, principal.getOrganizationId());
    }

    @Transactional
    public List<Map<String, Object>> numbering(UserPrincipal principal) {
        seedNumbering(principal.getOrganizationId(), principal.getId());
        return jdbc.queryForList("""
                select module_code as "moduleCode", prefix, format_pattern as "formatPattern",
                       next_sequence as "nextSequence", yearly_reset as "yearlyReset"
                from numbering_schemes
                where organization_id = ? and deleted_at is null
                order by module_code
                """, principal.getOrganizationId());
    }

    @Transactional
    public Map<String, Object> updateNumbering(UserPrincipal principal, String module, Map<String, Object> input,
                                               String ipAddress, String userAgent) {
        if (!MODULES.contains(module)) {
            throw new IllegalArgumentException("Unsupported module: " + module);
        }
        Long orgId = principal.getOrganizationId();
        Map<String, Object> old = numberingFor(orgId, module);
        String prefix = String.valueOf(input.getOrDefault("prefix", module.toUpperCase()));
        String pattern = String.valueOf(input.getOrDefault("formatPattern", prefix + "-{YYYY}-{SEQ}"));
        Number next = (Number) input.getOrDefault("nextSequence", 1);
        boolean yearlyReset = Boolean.TRUE.equals(input.getOrDefault("yearlyReset", true));
        jdbc.update("""
                insert into numbering_schemes (organization_id, module_code, prefix, format_pattern, next_sequence, yearly_reset, version, created_at, updated_at, updated_by)
                values (?, ?, ?, ?, ?, ?, 0, now(), now(), ?)
                on conflict (organization_id, module_code) do update
                  set prefix = excluded.prefix, format_pattern = excluded.format_pattern,
                      next_sequence = excluded.next_sequence, yearly_reset = excluded.yearly_reset,
                      updated_at = now(), updated_by = excluded.updated_by, version = numbering_schemes.version + 1
                """, orgId, module, prefix, pattern, next.longValue(), yearlyReset, principal.getId());
        Map<String, Object> updated = numberingFor(orgId, module);
        audit(orgId, "numbering:" + module, "UPDATE", old, updated, "Numbering scheme changed",
                principal, ipAddress, userAgent);
        return updated;
    }

    @Transactional
    public List<Map<String, Object>> notificationTemplates(UserPrincipal principal) {
        seedTemplates(principal.getOrganizationId(), principal.getId());
        return jdbc.queryForList("""
                select event_type as "eventType", subject, body, enabled
                from organization_notification_templates
                where organization_id = ? and deleted_at is null
                order by event_type
                """, principal.getOrganizationId());
    }

    @Transactional
    public Map<String, Object> updateTemplate(UserPrincipal principal, String eventType, Map<String, Object> input,
                                              String ipAddress, String userAgent) {
        Long orgId = principal.getOrganizationId();
        Map<String, Object> old = templateFor(orgId, eventType);
        jdbc.update("""
                insert into organization_notification_templates (organization_id, event_type, subject, body, enabled, version, created_at, updated_at, updated_by)
                values (?, ?, ?, ?, ?, 0, now(), now(), ?)
                on conflict (organization_id, event_type) do update
                  set subject = excluded.subject, body = excluded.body, enabled = excluded.enabled,
                      updated_at = now(), updated_by = excluded.updated_by, version = organization_notification_templates.version + 1
                """, orgId, eventType, String.valueOf(input.getOrDefault("subject", "")),
                String.valueOf(input.getOrDefault("body", "")),
                Boolean.TRUE.equals(input.getOrDefault("enabled", true)), principal.getId());
        Map<String, Object> updated = templateFor(orgId, eventType);
        audit(orgId, "notification:" + eventType, "UPDATE", old, updated, "Notification template changed",
                principal, ipAddress, userAgent);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> auditLog(UserPrincipal principal) {
        return jdbc.queryForList("""
                select section, action, reason, user_id as "userId", user_full_name as "userFullName",
                       utc_timestamp as "timestamp", old_value::text as "oldValue", new_value::text as "newValue"
                from admin_settings_audit_logs
                where organization_id = ?
                order by utc_timestamp desc
                limit 100
                """, principal.getOrganizationId());
    }

    private Map<String, Object> readSection(Long orgId, String section, Map<String, Object> defaults) {
        String json = jdbc.query("""
                select settings_json::text from organization_settings
                where organization_id = ? and section = ? and deleted_at is null
                """, rs -> rs.next() ? rs.getString(1) : null, orgId, section);
        if (json == null) {
            return defaults;
        }
        return fromJson(json);
    }

    private void upsertSection(Long orgId, String section, Map<String, Object> settings, Long userId) {
        jdbc.update("""
                insert into organization_settings (organization_id, section, settings_json, version, created_at, updated_at, updated_by)
                values (?, ?, ?::jsonb, 0, now(), now(), ?)
                on conflict (organization_id, section) do update
                  set settings_json = excluded.settings_json, updated_at = now(),
                      updated_by = excluded.updated_by, version = organization_settings.version + 1
                """, orgId, section, toJson(settings), userId);
    }

    private void audit(Long orgId, String section, String action, Map<String, Object> oldValue,
                       Map<String, Object> newValue, String reason, UserPrincipal principal,
                       String ipAddress, String userAgent) {
        jdbc.update("""
                insert into admin_settings_audit_logs
                (organization_id, section, action, old_value, new_value, reason, user_id, user_full_name, utc_timestamp, ip_address, user_agent)
                values (?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?, ?, ?)
                """, orgId, section, action, toJson(oldValue), toJson(newValue), reason,
                principal.getId(), principal.getFullName(), OffsetDateTime.now(clock), ipAddress, userAgent);
    }

    private void validate(String section, Map<String, Object> settings) {
        if ("security".equals(section)) {
            int minLength = ((Number) settings.getOrDefault("passwordMinimumLength", 12)).intValue();
            if (minLength < 8) {
                throw new IllegalArgumentException("Password minimum length cannot be below 8.");
            }
        }
        if ("data-retention".equals(section)) {
            int years = ((Number) settings.getOrDefault("retentionYears", 7)).intValue();
            if (years < 5) {
                throw new IllegalArgumentException("Retention cannot be below 5 years.");
            }
        }
    }

    private Map<String, Object> defaults(String section) {
        Map<String, Object> map = new LinkedHashMap<>();
        switch (section) {
            case "general" -> {
                map.put("companyName", "Default Organization");
                map.put("timezone", "UTC");
                map.put("language", "en");
                map.put("supportEmail", "quality@example.com");
                map.put("supportPhone", "");
                map.put("country", "");
            }
            case "onboarding" -> {
                map.put("companyProfile", false);
                map.put("sites", false);
                map.put("departments", false);
                map.put("users", false);
                map.put("roles", false);
                map.put("approvalMatrix", false);
                map.put("documentCategories", false);
                map.put("materialCategories", false);
                map.put("supplierRegister", false);
                map.put("productMaster", false);
            }
            case "security" -> {
                map.put("mfaRequired", true);
                map.put("mfaRequiredForSignatures", true);
                map.put("passwordMinimumLength", 12);
                map.put("uppercaseRequired", true);
                map.put("numberRequired", true);
                map.put("specialCharacterRequired", true);
                map.put("passwordExpiryDays", 90);
                map.put("sessionTimeoutMinutes", 30);
                map.put("accountLockoutAttempts", 5);
            }
            case "notifications" -> {
                map.put("emailNotificationsEnabled", true);
                map.put("dueSoonDays", 7);
                map.put("overdueEscalationEnabled", true);
            }
            case "data-retention" -> {
                map.put("retentionYears", 7);
                map.put("archiveEnabled", true);
                map.put("purgeEnabled", false);
                map.put("archivalLocation", "");
            }
            default -> {
            }
        }
        return map;
    }

    private void seedNumbering(Long orgId, Long userId) {
        for (String module : MODULES) {
            String prefix = switch (module) {
                case "documents" -> "DOC";
                case "change_control" -> "CC";
                case "capa" -> "CAPA";
                case "deviations" -> "DEV";
                case "materials" -> "MAT";
                case "batch_records" -> "BATCH";
                default -> module.toUpperCase().replace("_", "");
            };
            jdbc.update("""
                    insert into numbering_schemes (organization_id, module_code, prefix, format_pattern, next_sequence, yearly_reset, version, created_at, updated_at, updated_by)
                    values (?, ?, ?, ?, 1, true, 0, now(), now(), ?)
                    on conflict (organization_id, module_code) do nothing
                    """, orgId, module, prefix, prefix + "-{YYYY}-{SEQ}", userId);
        }
    }

    private void seedTemplates(Long orgId, Long userId) {
        List<String> events = List.of("document_approval", "document_rejection", "change_control_approval",
                "capa_due_soon", "capa_overdue", "deviation_assigned", "training_assigned",
                "training_overdue", "license_expiring_soon", "organization_suspended");
        for (String event : events) {
            jdbc.update("""
                    insert into organization_notification_templates (organization_id, event_type, subject, body, enabled, version, created_at, updated_at, updated_by)
                    values (?, ?, ?, ?, true, 0, now(), now(), ?)
                    on conflict (organization_id, event_type) do nothing
                    """, orgId, event, event.replace("_", " "), "Hello {user_name}, please review {record_number}.", userId);
        }
    }

    private Map<String, Object> numberingFor(Long orgId, String module) {
        Map<String, Object> row = jdbc.queryForMap("""
                select module_code as "moduleCode", prefix, format_pattern as "formatPattern", next_sequence as "nextSequence", yearly_reset as "yearlyReset"
                from numbering_schemes where organization_id = ? and module_code = ?
                """, orgId, module);
        row.put("example", String.valueOf(row.get("formatPattern"))
                .replace("{YYYY}", String.valueOf(Year.now(clock).getValue()))
                .replace("{SEQ}", String.format("%05d", ((Number) row.get("nextSequence")).longValue())));
        return row;
    }

    private Map<String, Object> templateFor(Long orgId, String eventType) {
        return jdbc.queryForMap("""
                select event_type as "eventType", subject, body, enabled
                from organization_notification_templates where organization_id = ? and event_type = ?
                """, orgId, eventType);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJson(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid settings JSON", e);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize settings", e);
        }
    }
}
