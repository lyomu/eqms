package com.eqms.admin.settings;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
    private static final Set<String> CRITICAL_SECTIONS = Set.of(
            "qms-scope", "approval-matrix", "workflow", "risk", "document-control", "training",
            "audit", "supplier", "equipment", "material", "quality-events", "oos-complaint",
            "change-control", "esignature", "audit-trail", "data-retention", "integrations",
            "management-review");

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
    public Map<String, Object> updateSection(UserPrincipal principal, String section, Map<String, Object> input,
                                             String ipAddress, String userAgent) {
        SettingsUpdate update = normalizeUpdate(input);
        validate(section, update.settings(), update);
        Long orgId = principal.getOrganizationId();
        Map<String, Object> old = readSection(orgId, section, defaults(section));
        upsertSection(orgId, section, update.settings(), principal.getId());
        audit(orgId, section, "UPDATE", old, update.settings(), auditReason(section, update),
                update.effectiveDate(), update.changeImpact(), update.approvalStatus(),
                principal, ipAddress, userAgent);
        return update.settings();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> configurationHealth(UserPrincipal principal) {
        Long orgId = principal.getOrganizationId();
        List<Map<String, Object>> warnings = new ArrayList<>();
        Map<String, Object> general = readSection(orgId, "general", defaults("general"));
        Map<String, Object> qmsScope = readSection(orgId, "qms-scope", defaults("qms-scope"));
        Map<String, Object> sites = readSection(orgId, "sites", defaults("sites"));
        Map<String, Object> approvalMatrix = readSection(orgId, "approval-matrix", defaults("approval-matrix"));
        Map<String, Object> risk = readSection(orgId, "risk", defaults("risk"));
        Map<String, Object> auditTrail = readSection(orgId, "audit-trail", defaults("audit-trail"));

        if (isBlank(general.get("companyName")) || isBlank(general.get("country"))) {
            warnings.add(warning("profile", "Organization profile incomplete", "Organization name and country are required."));
        }
        if (isBlank(qmsScope.get("scopeStatement"))) {
            warnings.add(warning("qms-scope", "QMS scope missing", "Define the QMS scope before relying on audit or management review references."));
        }
        if (asList(sites.get("sites")).isEmpty()) {
            warnings.add(warning("sites", "No site configured", "Add at least one active site or location."));
        }
        if (asList(approvalMatrix.get("rules")).isEmpty()) {
            warnings.add(warning("approval-matrix", "Approval matrix incomplete", "Configure reviewer and approver rules for controlled records."));
        }
        if (asList(risk.get("thresholds")).isEmpty()) {
            warnings.add(warning("risk", "Risk matrix not configured", "Define non-overlapping risk thresholds."));
        }
        if (!Boolean.TRUE.equals(auditTrail.get("auditTrailEnabled"))) {
            warnings.add(warning("audit-trail", "Audit trail cannot be disabled", "Regulated QMS modules require audit trail capture."));
        }
        return warnings;
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

    @Transactional(readOnly = true)
    public Map<String, Object> references(UserPrincipal principal) {
        Long orgId = principal.getOrganizationId();
        List<Map<String, Object>> users = jdbc.queryForList("""
                select id, full_name as "fullName", email, status
                from users
                where organization_id = ? and deleted_at is null
                order by full_name
                """, orgId);
        List<Map<String, Object>> roles = jdbc.queryForList("""
                select id, name, description
                from roles
                where deleted_at is null
                order by name
                """);
        List<Map<String, Object>> departments = jdbc.queryForList("""
                select id, code, name
                from departments
                where (organization_id = ? or organization_id is null) and deleted_at is null
                order by name
                """, orgId);
        return Map.of("users", users, "roles", roles, "departments", departments);
    }

    @Transactional
    public List<Map<String, Object>> numbering(UserPrincipal principal) {
        seedNumbering(principal.getOrganizationId(), principal.getId());
        return jdbc.queryForList("""
                select module_code as "moduleCode", prefix, format_pattern as "formatPattern",
                       next_sequence as "nextSequence", yearly_reset as "yearlyReset",
                       year_format as "yearFormat", sequence_length as "sequenceLength",
                       separator, reset_frequency as "resetFrequency", active
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
        String yearFormat = String.valueOf(input.getOrDefault("yearFormat", "YYYY"));
        int sequenceLength = ((Number) input.getOrDefault("sequenceLength", 5)).intValue();
        String separator = String.valueOf(input.getOrDefault("separator", "-"));
        String resetFrequency = String.valueOf(input.getOrDefault("resetFrequency", "Yearly"));
        validateNumbering(prefix, yearFormat, sequenceLength, separator, resetFrequency);
        String pattern = String.valueOf(input.getOrDefault("formatPattern",
                prefix + separator + "{" + yearFormat + "}" + separator + "{SEQ}"));
        Number next = (Number) input.getOrDefault("nextSequence", 1);
        boolean yearlyReset = Boolean.TRUE.equals(input.getOrDefault("yearlyReset", true));
        boolean active = !Boolean.FALSE.equals(input.getOrDefault("active", true));
        jdbc.update("""
                insert into numbering_schemes
                (organization_id, module_code, prefix, format_pattern, next_sequence, yearly_reset,
                 year_format, sequence_length, separator, reset_frequency, active, version, created_at, updated_at, updated_by)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, now(), now(), ?)
                on conflict (organization_id, module_code) do update
                  set prefix = excluded.prefix, format_pattern = excluded.format_pattern,
                      next_sequence = excluded.next_sequence, yearly_reset = excluded.yearly_reset,
                      year_format = excluded.year_format, sequence_length = excluded.sequence_length,
                      separator = excluded.separator, reset_frequency = excluded.reset_frequency,
                      active = excluded.active,
                      updated_at = now(), updated_by = excluded.updated_by, version = numbering_schemes.version + 1
                """, orgId, module, prefix, pattern, next.longValue(), yearlyReset,
                yearFormat, sequenceLength, separator, resetFrequency, active, principal.getId());
        Map<String, Object> updated = numberingFor(orgId, module);
        audit(orgId, "numbering:" + module, "UPDATE", old, updated, "Numbering scheme changed",
                null, null, "Not Required", principal, ipAddress, userAgent);
        return updated;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewNumbering(UserPrincipal principal, String module, Map<String, Object> input) {
        if (!MODULES.contains(module)) {
            throw new IllegalArgumentException("Unsupported module: " + module);
        }
        String prefix = String.valueOf(input.getOrDefault("prefix", module.toUpperCase()));
        String yearFormat = String.valueOf(input.getOrDefault("yearFormat", "YYYY"));
        int sequenceLength = ((Number) input.getOrDefault("sequenceLength", 5)).intValue();
        String separator = String.valueOf(input.getOrDefault("separator", "-"));
        String resetFrequency = String.valueOf(input.getOrDefault("resetFrequency", "Yearly"));
        validateNumbering(prefix, yearFormat, sequenceLength, separator, resetFrequency);
        long next = ((Number) input.getOrDefault("nextSequence", 1)).longValue();
        String pattern = String.valueOf(input.getOrDefault("formatPattern",
                prefix + separator + "{" + yearFormat + "}" + separator + "{SEQ}"));
        return Map.of("moduleCode", module, "example", preview(pattern, yearFormat, sequenceLength, next));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> changeRequests(UserPrincipal principal) {
        return jdbc.queryForList("""
                select id, section, status, change_reason as "changeReason", change_impact as "changeImpact",
                       effective_date as "effectiveDate", requested_by as "requestedBy",
                       requested_by_name as "requestedByName", requested_at as "requestedAt",
                       reviewed_by as "reviewedBy", reviewed_by_name as "reviewedByName",
                       reviewed_at as "reviewedAt", review_comment as "reviewComment",
                       old_value::text as "oldValue", proposed_value::text as "proposedValue"
                from settings_change_requests
                where organization_id = ? and deleted_at is null
                order by requested_at desc
                limit 100
                """, principal.getOrganizationId());
    }

    @Transactional
    public Map<String, Object> createChangeRequest(UserPrincipal principal, String section, Map<String, Object> input,
                                                   String ipAddress, String userAgent) {
        SettingsUpdate update = normalizeUpdate(input);
        validate(section, update.settings(), update);
        Long orgId = principal.getOrganizationId();
        Map<String, Object> old = readSection(orgId, section, defaults(section));
        Long id = jdbc.queryForObject("""
                insert into settings_change_requests
                (organization_id, section, old_value, proposed_value, change_reason, change_impact,
                 effective_date, status, requested_by, requested_by_name, requested_at)
                values (?, ?, ?::jsonb, ?::jsonb, ?, ?, ?::date, 'PENDING', ?, ?, ?)
                returning id
                """, Long.class, orgId, section, toJson(old), toJson(update.settings()),
                update.changeReason(), update.changeImpact(), update.effectiveDate(),
                principal.getId(), principal.getFullName(), OffsetDateTime.now(clock));
        audit(orgId, section, "CHANGE_REQUEST", old, update.settings(), update.changeReason(),
                update.effectiveDate(), update.changeImpact(), "PENDING", principal, ipAddress, userAgent);
        return changeRequestFor(orgId, id);
    }

    @Transactional
    public Map<String, Object> approveChangeRequest(UserPrincipal principal, Long id, Map<String, Object> input,
                                                    String ipAddress, String userAgent) {
        Long orgId = principal.getOrganizationId();
        Map<String, Object> request = changeRequestFor(orgId, id);
        if (!"PENDING".equals(request.get("status"))) {
            throw new IllegalArgumentException("Only pending settings change requests can be approved.");
        }
        Long requestedBy = ((Number) request.get("requestedBy")).longValue();
        if (requestedBy.equals(principal.getId())) {
            throw new IllegalArgumentException("Users cannot approve their own settings change requests.");
        }
        Map<String, Object> proposed = fromJson(String.valueOf(request.get("proposedValue")));
        String section = String.valueOf(request.get("section"));
        upsertSection(orgId, section, proposed, principal.getId());
        String comment = String.valueOf(input.getOrDefault("comment", "Approved"));
        jdbc.update("""
                update settings_change_requests
                set status = 'APPROVED', reviewed_by = ?, reviewed_by_name = ?, reviewed_at = ?,
                    review_comment = ?, version = version + 1
                where organization_id = ? and id = ? and status = 'PENDING'
                """, principal.getId(), principal.getFullName(), OffsetDateTime.now(clock), comment, orgId, id);
        audit(orgId, section, "APPROVE", fromJson(String.valueOf(request.get("oldValue"))), proposed,
                comment, String.valueOf(request.get("effectiveDate")),
                stringOrNull(request.get("changeImpact")), "APPROVED", principal, ipAddress, userAgent);
        return changeRequestFor(orgId, id);
    }

    @Transactional
    public Map<String, Object> rejectChangeRequest(UserPrincipal principal, Long id, Map<String, Object> input,
                                                   String ipAddress, String userAgent) {
        Long orgId = principal.getOrganizationId();
        Map<String, Object> request = changeRequestFor(orgId, id);
        if (!"PENDING".equals(request.get("status"))) {
            throw new IllegalArgumentException("Only pending settings change requests can be rejected.");
        }
        String comment = String.valueOf(input.getOrDefault("comment", "Rejected"));
        jdbc.update("""
                update settings_change_requests
                set status = 'REJECTED', reviewed_by = ?, reviewed_by_name = ?, reviewed_at = ?,
                    review_comment = ?, version = version + 1
                where organization_id = ? and id = ? and status = 'PENDING'
                """, principal.getId(), principal.getFullName(), OffsetDateTime.now(clock), comment, orgId, id);
        audit(orgId, String.valueOf(request.get("section")), "REJECT",
                fromJson(String.valueOf(request.get("oldValue"))),
                fromJson(String.valueOf(request.get("proposedValue"))),
                comment, String.valueOf(request.get("effectiveDate")),
                stringOrNull(request.get("changeImpact")), "REJECTED", principal, ipAddress, userAgent);
        return changeRequestFor(orgId, id);
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
                null, null, "Not Required", principal, ipAddress, userAgent);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> auditLog(UserPrincipal principal) {
        return jdbc.queryForList("""
                select section, action, reason, user_id as "userId", user_full_name as "userFullName",
                       utc_timestamp as "timestamp", old_value::text as "oldValue", new_value::text as "newValue",
                       effective_date as "effectiveDate", change_impact as "changeImpact",
                       approval_status as "approvalStatus"
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
                       Map<String, Object> newValue, String reason, String effectiveDate,
                       String changeImpact, String approvalStatus, UserPrincipal principal,
                       String ipAddress, String userAgent) {
        jdbc.update("""
                insert into admin_settings_audit_logs
                (organization_id, section, action, old_value, new_value, reason, effective_date,
                 change_impact, approval_status, user_id, user_full_name, utc_timestamp, ip_address, user_agent)
                values (?, ?, ?, ?::jsonb, ?::jsonb, ?, ?::date, ?, ?, ?, ?, ?, ?, ?)
                """, orgId, section, action, toJson(oldValue), toJson(newValue), reason,
                effectiveDate, changeImpact, approvalStatus, principal.getId(), principal.getFullName(),
                OffsetDateTime.now(clock), ipAddress, userAgent);
    }

    private void validate(String section, Map<String, Object> settings, SettingsUpdate update) {
        if (CRITICAL_SECTIONS.contains(section)) {
            if (isBlank(update.changeReason())) {
                throw new IllegalArgumentException("Critical settings changes require a change reason.");
            }
            if (isBlank(update.effectiveDate())) {
                throw new IllegalArgumentException("Critical settings changes require an effective date.");
            }
            parseDate(update.effectiveDate(), "effectiveDate");
        }
        if ("general".equals(section)) {
            if (isBlank(settings.get("companyName"))) {
                throw new IllegalArgumentException("Organization name is required.");
            }
            if (isBlank(settings.get("country"))) {
                throw new IllegalArgumentException("Country is required.");
            }
        }
        if ("qms-scope".equals(section)) {
            if ("Approved".equals(settings.get("scopeStatus")) && isBlank(settings.get("scopeStatement"))) {
                throw new IllegalArgumentException("QMS scope is required before approval.");
            }
            if (!isBlank(settings.get("nextReviewDate"))) {
                parseDate(String.valueOf(settings.get("nextReviewDate")), "nextReviewDate");
            }
        }
        if ("sites".equals(section)) {
            for (Object row : asList(settings.get("sites"))) {
                Map<?, ?> site = requireMap(row, "site");
                if (isBlank(site.get("siteName"))) {
                    throw new IllegalArgumentException("Site name is required.");
                }
            }
        }
        if ("departments-processes".equals(section)) {
            for (Object row : asList(settings.get("departments"))) {
                Map<?, ?> department = requireMap(row, "department");
                if (isBlank(department.get("departmentName"))) {
                    throw new IllegalArgumentException("Department name is required.");
                }
            }
            for (Object row : asList(settings.get("processes"))) {
                Map<?, ?> process = requireMap(row, "process");
                if (Boolean.TRUE.equals(process.get("critical")) && isBlank(process.get("processOwner"))) {
                    throw new IllegalArgumentException("Critical processes require a process owner.");
                }
            }
        }
        if ("approval-matrix".equals(section)) {
            for (Object row : asList(settings.get("rules"))) {
                Map<?, ?> rule = requireMap(row, "approval matrix rule");
                if (isBlank(rule.get("module")) || isBlank(rule.get("requiredApproverRole"))) {
                    throw new IllegalArgumentException("Approval matrix rules require a module and approver role.");
                }
                if (isBlank(rule.get("effectiveDate"))) {
                    throw new IllegalArgumentException("Approval matrix rules require an effective date.");
                }
                parseDate(String.valueOf(rule.get("effectiveDate")), "approval rule effectiveDate");
                if (Boolean.TRUE.equals(rule.get("selfApprovalAllowed"))) {
                    throw new IllegalArgumentException("Self-approval is prohibited for QMS records.");
                }
            }
        }
        if ("risk".equals(section)) {
            validateThresholds(asList(settings.get("thresholds")));
        }
        if ("audit-trail".equals(section) && !Boolean.TRUE.equals(settings.get("auditTrailEnabled"))) {
            throw new IllegalArgumentException("Audit trail cannot be disabled for regulated QMS modules.");
        }
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
            if (Boolean.TRUE.equals(settings.get("hardDeleteAllowed"))) {
                throw new IllegalArgumentException("Hard delete cannot be enabled for quality records.");
            }
            if (Boolean.FALSE.equals(settings.get("softDeleteEnabled"))) {
                throw new IllegalArgumentException("Soft delete must remain enabled for regulated records.");
            }
        }
        if ("training".equals(section)) {
            int passingScore = ((Number) settings.getOrDefault("passingScore", 80)).intValue();
            if (passingScore < 0 || passingScore > 100) {
                throw new IllegalArgumentException("Training passing score must be between 0 and 100.");
            }
        }
        if ("integrations".equals(section) && Boolean.FALSE.equals(settings.get("secretsStoredExternally"))) {
            throw new IllegalArgumentException("Integration secrets must not be stored in plain organization settings.");
        }
        if ("management-review".equals(section)) {
            int months = ((Number) settings.getOrDefault("reviewFrequencyMonths", 12)).intValue();
            if (months < 1) {
                throw new IllegalArgumentException("Management review frequency must be at least 1 month.");
            }
        }
    }

    private Map<String, Object> defaults(String section) {
        Map<String, Object> map = new LinkedHashMap<>();
        switch (section) {
            case "general" -> {
                map.put("companyName", "Default Organization");
                map.put("legalName", "");
                map.put("organizationCode", "");
                map.put("registrationNumber", "");
                map.put("taxNumber", "");
                map.put("industry", "");
                map.put("organizationType", "Pharmaceutical Company");
                map.put("primaryContactPerson", "");
                map.put("timezone", "UTC");
                map.put("language", "en");
                map.put("supportEmail", "quality@example.com");
                map.put("supportPhone", "");
                map.put("country", "");
                map.put("cityRegion", "");
                map.put("physicalAddress", "");
                map.put("postalAddress", "");
                map.put("website", "");
                map.put("brandColor", "#0f766e");
                map.put("organizationStatus", "Active");
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
                map.put("softDeleteEnabled", true);
                map.put("hardDeleteAllowed", false);
                map.put("legalHoldEnabled", true);
            }
            case "qms-scope" -> {
                map.put("scopeStatement", "");
                map.put("productsServicesCovered", "");
                map.put("sitesCovered", "");
                map.put("departmentsCovered", "");
                map.put("processesCovered", "");
                map.put("exclusions", "");
                map.put("applicableStandards", List.of("Internal QMS Only"));
                map.put("regulatoryRequirements", "");
                map.put("customerRequirements", "");
                map.put("interestedParties", "");
                map.put("scopeOwner", "");
                map.put("scopeReviewer", "");
                map.put("scopeApprover", "");
                map.put("scopeApprovalDate", "");
                map.put("nextReviewDate", "");
                map.put("scopeStatus", "Draft");
            }
            case "sites" -> map.put("sites", List.of());
            case "departments-processes" -> {
                map.put("departments", List.of());
                map.put("processes", List.of());
            }
            case "approval-matrix" -> map.put("rules", List.of());
            case "workflow" -> {
                map.put("approvalWorkflowEnabled", true);
                map.put("requiredCommentsForRejection", true);
                map.put("requiredEvidenceBeforeApproval", true);
                map.put("allowReopeningClosedRecords", false);
                map.put("allowEditingApprovedRecords", false);
                map.put("closureRequiresQaApproval", true);
            }
            case "risk" -> {
                map.put("scoringMethod", "3-Factor FMEA / RPN");
                map.put("riskLevelLabels", List.of("Low", "Medium", "High", "Critical"));
                map.put("thresholds", List.of(
                        Map.of("level", "Low", "min", 1, "max", 20),
                        Map.of("level", "Medium", "min", 21, "max", 60),
                        Map.of("level", "High", "min", 61, "max", 120),
                        Map.of("level", "Critical", "min", 121, "max", 250)
                ));
                map.put("residualRiskAcceptanceRequired", true);
                map.put("highRiskApproverRole", "QA Manager");
            }
            case "document-control" -> {
                map.put("defaultReviewFrequencyMonths", 24);
                map.put("versionFormat", "1.0");
                map.put("effectiveDateRequired", true);
                map.put("periodicReviewRequired", true);
                map.put("obsoleteControlEnabled", true);
                map.put("trainingRequiredOnNewRevision", true);
                map.put("approvalWorkflowRequired", true);
                map.put("draftObsoleteWatermarksEnabled", true);
            }
            case "training" -> {
                map.put("trainingRequiredByRole", true);
                map.put("sopLinkedTrainingEnabled", true);
                map.put("retrainingAfterDocumentRevision", true);
                map.put("assessmentRequired", false);
                map.put("passingScore", 80);
                map.put("competenceApprovalRequired", true);
                map.put("trainingEvidenceRequired", true);
            }
            case "audit" -> {
                map.put("defaultAuditFrequencyMonths", 12);
                map.put("riskBasedFrequencyEnabled", true);
                map.put("auditorIndependenceRequired", true);
                map.put("evidenceRequiredForFindings", true);
                map.put("capaRequiredForMajorFindings", true);
                map.put("auditReportApprovalRequired", true);
                map.put("followUpRequired", true);
            }
            case "supplier" -> {
                map.put("qualificationRequired", true);
                map.put("riskAssessmentRequired", true);
                map.put("qualityAgreementRequiredForCritical", true);
                map.put("approvedSupplierRequiredBeforeReceipt", true);
                map.put("conditionalApprovalAllowed", true);
                map.put("blockSuspendedSuppliers", true);
                map.put("blockDisqualifiedSuppliers", true);
            }
            case "equipment" -> {
                map.put("qualificationRequired", true);
                map.put("calibrationRequired", true);
                map.put("preventiveMaintenanceRequired", true);
                map.put("returnToServiceApprovalRequired", true);
                map.put("blockUseWhenCalibrationOverdue", true);
                map.put("blockUseWhenMaintenanceOverdue", true);
                map.put("blockUseWhenNotQualified", true);
                map.put("blockUseWhenOutOfService", true);
            }
            case "material" -> {
                map.put("qaReleaseRequired", true);
                map.put("supplierApprovalRequired", true);
                map.put("expiryRetestRequired", true);
                map.put("quarantineOnReceipt", true);
                map.put("blockExpiredMaterials", true);
                map.put("blockRejectedLots", true);
            }
            case "quality-events" -> {
                map.put("capaClosureRequiresQaApproval", true);
                map.put("deviationClosureRequiresQaApproval", true);
                map.put("ncrDispositionRequiresApproval", true);
                map.put("effectivenessCheckRequired", true);
                map.put("rootCauseRequired", true);
            }
            case "oos-complaint" -> {
                map.put("oosQaReviewRequired", true);
                map.put("ootHandledAsOos", true);
                map.put("complaintInvestigationRequired", true);
                map.put("complaintClosureRequiresApproval", true);
            }
            case "change-control" -> {
                map.put("impactAssessmentRequired", true);
                map.put("qaApprovalRequired", true);
                map.put("implementationEvidenceRequired", true);
                map.put("effectivenessReviewRequired", true);
            }
            case "esignature" -> {
                map.put("esignatureEnabled", true);
                map.put("passwordReauthenticationRequired", true);
                map.put("signatureHistoryEnabled", true);
                map.put("signatureStatementTemplate", "Electronically signed by {user_name} for {meaning} on {timestamp}.");
                map.put("requiredFor", List.of("Document Approval", "CAPA Closure", "Deviation Closure", "Change Control Approval"));
            }
            case "audit-trail" -> {
                map.put("auditTrailEnabled", true);
                map.put("captureOldNewValues", true);
                map.put("captureReasonForChange", true);
                map.put("requireReasonForCriticalChanges", true);
                map.put("preventHardDeleteApprovedRecords", true);
                map.put("lockApprovedRecords", true);
                map.put("lockClosedRecords", true);
                map.put("allowAmendmentsRevisions", true);
                map.put("adminOverrideAllowed", false);
            }
            case "localization" -> {
                map.put("timezone", "UTC");
                map.put("dateFormat", "yyyy-MM-dd");
                map.put("timeFormat", "HH:mm");
                map.put("language", "en");
                map.put("currency", "USD");
                map.put("weightUnit", "kg");
                map.put("volumeUnit", "L");
                map.put("temperatureUnit", "C");
                map.put("decimalPrecision", 2);
                map.put("weekStartDay", "Monday");
            }
            case "integrations" -> {
                map.put("emailEnabled", true);
                map.put("smsEnabled", false);
                map.put("webhooksEnabled", false);
                map.put("ssoEnabled", false);
                map.put("secretsStoredExternally", true);
            }
            case "management-review" -> {
                map.put("reviewFrequencyMonths", 12);
                map.put("defaultMeetingOwner", "");
                map.put("requiredInputs", List.of("Audit Results", "CAPA Status", "Deviations/NCR", "Complaints", "Supplier Performance", "Risk Status", "Training Status"));
                map.put("requiredOutputs", List.of("Decisions", "Actions", "Resource Needs", "Improvement Actions", "Assigned Owners", "Due Dates"));
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
                select module_code as "moduleCode", prefix, format_pattern as "formatPattern",
                       next_sequence as "nextSequence", yearly_reset as "yearlyReset",
                       year_format as "yearFormat", sequence_length as "sequenceLength",
                       separator, reset_frequency as "resetFrequency", active
                from numbering_schemes where organization_id = ? and module_code = ?
                """, orgId, module);
        row.put("example", preview(String.valueOf(row.get("formatPattern")),
                String.valueOf(row.get("yearFormat")),
                ((Number) row.get("sequenceLength")).intValue(),
                ((Number) row.get("nextSequence")).longValue()));
        return row;
    }

    private Map<String, Object> changeRequestFor(Long orgId, Long id) {
        return jdbc.queryForMap("""
                select id, section, status, change_reason as "changeReason", change_impact as "changeImpact",
                       effective_date as "effectiveDate", requested_by as "requestedBy",
                       requested_by_name as "requestedByName", requested_at as "requestedAt",
                       reviewed_by as "reviewedBy", reviewed_by_name as "reviewedByName",
                       reviewed_at as "reviewedAt", review_comment as "reviewComment",
                       old_value::text as "oldValue", proposed_value::text as "proposedValue"
                from settings_change_requests
                where organization_id = ? and id = ? and deleted_at is null
                """, orgId, id);
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

    @SuppressWarnings("unchecked")
    private SettingsUpdate normalizeUpdate(Map<String, Object> input) {
        if (input.containsKey("settings") && input.get("settings") instanceof Map<?, ?> settings) {
            return new SettingsUpdate((Map<String, Object>) settings,
                    stringOrNull(input.get("changeReason")),
                    stringOrNull(input.get("effectiveDate")),
                    stringOrNull(input.get("changeImpact")),
                    stringOrDefault(input.get("approvalStatus"), "Not Required"));
        }
        return new SettingsUpdate(input, null, null, null, "Not Required");
    }

    private String auditReason(String section, SettingsUpdate update) {
        if (!isBlank(update.changeReason())) {
            return update.changeReason();
        }
        return CRITICAL_SECTIONS.contains(section)
                ? "Critical organization settings updated"
                : "Organization admin settings updated";
    }

    private Map<String, Object> warning(String key, String title, String message) {
        return Map.of("key", key, "title", title, "message", message, "severity", "warning");
    }

    private void validateThresholds(List<Object> thresholds) {
        List<int[]> ranges = new ArrayList<>();
        for (Object row : thresholds) {
            Map<?, ?> threshold = requireMap(row, "risk threshold");
            int min = numberOrDefault(threshold.get("min"), 0);
            int max = numberOrDefault(threshold.get("max"), 0);
            if (min > max) {
                throw new IllegalArgumentException("Risk threshold minimum cannot exceed maximum.");
            }
            for (int[] existing : ranges) {
                if (min <= existing[1] && max >= existing[0]) {
                    throw new IllegalArgumentException("Risk threshold ranges cannot overlap.");
                }
            }
            ranges.add(new int[] {min, max});
        }
    }

    private void validateNumbering(String prefix, String yearFormat, int sequenceLength,
                                   String separator, String resetFrequency) {
        if (isBlank(prefix)) {
            throw new IllegalArgumentException("Numbering prefix is required.");
        }
        if (!List.of("YYYY", "YY", "NONE").contains(yearFormat)) {
            throw new IllegalArgumentException("Unsupported year format.");
        }
        if (sequenceLength < 1 || sequenceLength > 10) {
            throw new IllegalArgumentException("Sequence length must be between 1 and 10.");
        }
        if (separator.length() > 5) {
            throw new IllegalArgumentException("Numbering separator is too long.");
        }
        if (!List.of("Never", "Yearly", "Monthly").contains(resetFrequency)) {
            throw new IllegalArgumentException("Unsupported reset frequency.");
        }
    }

    private String preview(String pattern, String yearFormat, int sequenceLength, long nextSequence) {
        String year = switch (yearFormat) {
            case "YY" -> String.valueOf(Year.now(clock).getValue()).substring(2);
            case "NONE" -> "";
            default -> String.valueOf(Year.now(clock).getValue());
        };
        return pattern
                .replace("{YYYY}", String.valueOf(Year.now(clock).getValue()))
                .replace("{YY}", String.valueOf(Year.now(clock).getValue()).substring(2))
                .replace("{NONE}", "")
                .replace("{" + yearFormat + "}", year)
                .replace("{SEQ}", String.format("%0" + sequenceLength + "d", nextSequence));
    }

    private Map<?, ?> requireMap(Object value, String label) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("Invalid " + label + " entry.");
        }
        return map;
    }

    private void parseDate(String value, String field) {
        try {
            LocalDate.parse(value);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException(field + " must use yyyy-MM-dd format.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object> asList(Object value) {
        return value instanceof List<?> list ? (List<Object>) list : List.of();
    }

    private boolean isBlank(Object value) {
        return value == null || String.valueOf(value).trim().isEmpty();
    }

    private String stringOrNull(Object value) {
        return value == null || String.valueOf(value).trim().isEmpty() ? null : String.valueOf(value);
    }

    private String stringOrDefault(Object value, String fallback) {
        String text = stringOrNull(value);
        return text == null ? fallback : text;
    }

    private int numberOrDefault(Object value, int fallback) {
        return value instanceof Number number ? number.intValue() : fallback;
    }

    private record SettingsUpdate(Map<String, Object> settings, String changeReason,
                                  String effectiveDate, String changeImpact, String approvalStatus) {
    }
}
