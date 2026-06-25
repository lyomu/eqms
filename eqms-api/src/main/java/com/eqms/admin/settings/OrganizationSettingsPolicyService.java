package com.eqms.admin.settings;

import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.tenant.TenantContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OrganizationSettingsPolicyService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public OrganizationSettingsPolicyService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public boolean enabled(String section, String key, boolean fallback) {
        Long orgId = TenantContext.getOrganizationId();
        if (orgId == null) {
            return fallback;
        }
        String json = jdbc.query("""
                select settings_json::text
                from organization_settings
                where organization_id = ? and section = ? and deleted_at is null
                """, rs -> rs.next() ? rs.getString(1) : null, orgId, section);
        if (json == null) {
            return fallback;
        }
        Object value = fromJson(json).get(key);
        return value instanceof Boolean bool ? bool : fallback;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJson(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid organization settings JSON", e);
        }
    }
}
