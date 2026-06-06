package com.eqms.platform;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditService;
import com.eqms.auth.UserPrincipal;
import com.eqms.shared.constants.AuditAction;

@Service
public class PlatformAdminService {

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public PlatformAdminService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional
    public Map<String, Object> createOrganization(OrganizationRequest request, UserPrincipal actor) {
        Long organizationId = jdbc.queryForObject("""
                insert into organizations (code, name, legal_name, primary_contact_name, primary_contact_email, country, timezone, status, version, created_at, updated_at)
                values (?, ?, ?, ?, ?, ?, ?, 'trialing', 0, now(), now())
                returning id
                """, Long.class, request.code(), request.name(), request.legalName(), request.primaryContactName(),
                request.primaryContactEmail(), request.country(), request.timezoneOrDefault());

        Long planId = planId(request.planCode() == null ? "starter" : request.planCode());
        Long subscriptionId = jdbc.queryForObject("""
                insert into organization_subscriptions (organization_id, plan_id, status, trial_ends_at, current_period_starts_at, current_period_ends_at, version, created_at, updated_at)
                values (?, ?, 'trialing', now() + interval '30 days', now(), now() + interval '30 days', 0, now(), now())
                returning id
                """, Long.class, organizationId, planId);
        jdbc.update("""
                insert into organization_licenses (organization_id, subscription_id, status, starts_at, expires_at, user_limit, site_limit, version, created_at, updated_at)
                select ?, ?, 'trialing', now(), now() + interval '30 days', user_limit, site_limit, 0, now(), now()
                from plans where id = ?
                """, organizationId, subscriptionId, planId);
        jdbc.update("""
                insert into organization_module_licenses (organization_id, module_id, enabled, status, starts_at, expires_at, version, created_at, updated_at)
                select ?, module_id, true, 'trialing', now(), now() + interval '30 days', 0, now(), now()
                from plan_modules
                where plan_id = ? and included = true and deleted_at is null
                on conflict (organization_id, module_id) do nothing
                """, organizationId, planId);

        audit.record("Organization", String.valueOf(organizationId), AuditAction.CREATE,
                actor.getId(), actor.getFullName(), "Platform organization created");
        return organization(organizationId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> organizations() {
        return jdbc.queryForList("""
                select o.id, o.code, o.name, o.status, o.primary_contact_email as "primaryContactEmail",
                       p.name as "planName", l.user_limit as "userLimit", l.expires_at as "expiresAt",
                       (select count(*) from users u where u.organization_id = o.id and u.deleted_at is null) as "userCount"
                from organizations o
                left join organization_licenses l on l.organization_id = o.id and l.deleted_at is null
                left join organization_subscriptions s on s.organization_id = o.id and s.deleted_at is null
                left join plans p on p.id = s.plan_id
                where o.deleted_at is null
                order by o.created_at desc
                """);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> organization(Long id) {
        Map<String, Object> organization = jdbc.queryForMap("""
                select o.id, o.code, o.name, o.legal_name as "legalName", o.status,
                       o.primary_contact_name as "primaryContactName",
                       o.primary_contact_email as "primaryContactEmail",
                       o.country, o.timezone, o.read_only_reason as "readOnlyReason",
                       p.code as "planCode", p.name as "planName",
                       l.user_limit as "userLimit", l.site_limit as "siteLimit", l.expires_at as "expiresAt",
                       (select count(*) from users u where u.organization_id = o.id and u.deleted_at is null) as "userCount"
                from organizations o
                left join organization_licenses l on l.organization_id = o.id and l.deleted_at is null
                left join organization_subscriptions s on s.organization_id = o.id and s.deleted_at is null
                left join plans p on p.id = s.plan_id
                where o.id = ? and o.deleted_at is null
                """, id);
        organization.put("modules", modulesForOrganization(id));
        return organization;
    }

    @Transactional
    public Map<String, Object> updateOrganization(Long id, OrganizationRequest request, UserPrincipal actor) {
        jdbc.update("""
                update organizations
                set name = coalesce(?, name),
                    legal_name = coalesce(?, legal_name),
                    primary_contact_name = coalesce(?, primary_contact_name),
                    primary_contact_email = coalesce(?, primary_contact_email),
                    country = coalesce(?, country),
                    timezone = coalesce(?, timezone),
                    updated_at = now(),
                    version = version + 1
                where id = ? and deleted_at is null
                """, request.name(), request.legalName(), request.primaryContactName(),
                request.primaryContactEmail(), request.country(), request.timezone(), id);
        audit.record("Organization", String.valueOf(id), AuditAction.UPDATE,
                actor.getId(), actor.getFullName(), "Platform organization updated");
        return organization(id);
    }

    @Transactional
    public Map<String, Object> suspend(Long id, UserPrincipal actor) {
        jdbc.update("""
                update organizations
                set status = 'suspended', suspended_at = now(), read_only_reason = 'Suspended by platform admin',
                    updated_at = now(), version = version + 1
                where id = ?
                """, id);
        jdbc.update("update organization_licenses set status = 'suspended', suspended_at = now(), updated_at = now(), version = version + 1 where organization_id = ? and deleted_at is null", id);
        audit.record("Organization", String.valueOf(id), AuditAction.STATUS_CHANGE,
                actor.getId(), actor.getFullName(), "Organization suspended");
        return organization(id);
    }

    @Transactional
    public Map<String, Object> reactivate(Long id, UserPrincipal actor) {
        jdbc.update("""
                update organizations
                set status = 'active', suspended_at = null, read_only_reason = null,
                    updated_at = now(), version = version + 1
                where id = ?
                """, id);
        jdbc.update("update organization_licenses set status = 'active', suspended_at = null, updated_at = now(), version = version + 1 where organization_id = ? and deleted_at is null", id);
        audit.record("Organization", String.valueOf(id), AuditAction.STATUS_CHANGE,
                actor.getId(), actor.getFullName(), "Organization reactivated");
        return organization(id);
    }

    @Transactional
    public Map<String, Object> changePlan(Long id, ChangePlanRequest request, UserPrincipal actor) {
        Long planId = planId(request.planCode());
        jdbc.update("""
                update organization_subscriptions
                set plan_id = ?, status = 'active', updated_at = now(), version = version + 1
                where organization_id = ? and deleted_at is null
                """, planId, id);
        jdbc.update("""
                update organization_licenses
                set status = 'active',
                    user_limit = (select user_limit from plans where id = ?),
                    site_limit = (select site_limit from plans where id = ?),
                    expires_at = coalesce(?, expires_at),
                    updated_at = now(),
                    version = version + 1
                where organization_id = ? and deleted_at is null
                """, planId, planId, request.expiresAt(), id);
        jdbc.update("""
                insert into organization_module_licenses (organization_id, module_id, enabled, status, starts_at, expires_at, version, created_at, updated_at)
                select ?, module_id, true, 'active', now(), ?, 0, now(), now()
                from plan_modules where plan_id = ? and included = true and deleted_at is null
                on conflict (organization_id, module_id) do update
                  set enabled = true, status = 'active', updated_at = now(), version = organization_module_licenses.version + 1
                """, id, request.expiresAt(), planId);
        audit.record("Organization", String.valueOf(id), AuditAction.UPDATE,
                actor.getId(), actor.getFullName(), "Organization plan changed to " + request.planCode());
        return organization(id);
    }

    @Transactional
    public Map<String, Object> setModule(Long id, ModuleToggleRequest request, boolean enabled, UserPrincipal actor) {
        Long moduleId = moduleId(request.moduleCode());
        jdbc.update("""
                insert into organization_module_licenses (organization_id, module_id, enabled, status, starts_at, expires_at, version, created_at, updated_at)
                values (?, ?, ?, 'active', now(), ?, 0, now(), now())
                on conflict (organization_id, module_id) do update
                  set enabled = excluded.enabled, status = 'active', expires_at = excluded.expires_at,
                      updated_at = now(), version = organization_module_licenses.version + 1
                """, id, moduleId, enabled, request.expiresAt());
        audit.record("Organization", String.valueOf(id), AuditAction.UPDATE,
                actor.getId(), actor.getFullName(),
                (enabled ? "Module enabled: " : "Module disabled: ") + request.moduleCode());
        return organization(id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> plans() {
        return jdbc.queryForList("""
                select p.id, p.code, p.name, p.description, p.user_limit as "userLimit",
                       p.site_limit as "siteLimit", p.is_custom as "custom", p.active,
                       count(pm.module_id) filter (where pm.included = true and pm.deleted_at is null) as "moduleCount"
                from plans p
                left join plan_modules pm on pm.plan_id = p.id
                where p.deleted_at is null
                group by p.id
                order by p.id
                """);
    }

    @Transactional
    public Map<String, Object> createPlan(PlanRequest request, UserPrincipal actor) {
        Long id = jdbc.queryForObject("""
                insert into plans (code, name, description, user_limit, site_limit, is_custom, active, version, created_at, updated_at)
                values (?, ?, ?, ?, ?, ?, true, 0, now(), now())
                returning id
                """, Long.class, request.code(), request.name(), request.description(),
                request.userLimit(), request.siteLimit(), request.custom());
        audit.record("Plan", String.valueOf(id), AuditAction.CREATE,
                actor.getId(), actor.getFullName(), "Plan created");
        return jdbc.queryForMap("select * from plans where id = ?", id);
    }

    @Transactional
    public Map<String, Object> updatePlan(Long id, PlanRequest request, UserPrincipal actor) {
        jdbc.update("""
                update plans
                set name = coalesce(?, name), description = coalesce(?, description),
                    user_limit = ?, site_limit = ?, is_custom = coalesce(?, is_custom),
                    updated_at = now(), version = version + 1
                where id = ? and deleted_at is null
                """, request.name(), request.description(), request.userLimit(), request.siteLimit(), request.custom(), id);
        audit.record("Plan", String.valueOf(id), AuditAction.UPDATE,
                actor.getId(), actor.getFullName(), "Plan updated");
        return jdbc.queryForMap("select * from plans where id = ?", id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> modules() {
        return jdbc.queryForList("select id, code, name, description, active from modules where deleted_at is null order by name");
    }

    private List<Map<String, Object>> modulesForOrganization(Long id) {
        return jdbc.queryForList("""
                select m.id, m.code, m.name, oml.enabled, oml.status, oml.expires_at as "expiresAt"
                from modules m
                left join organization_module_licenses oml on oml.module_id = m.id and oml.organization_id = ? and oml.deleted_at is null
                where m.deleted_at is null
                order by m.name
                """, id);
    }

    private Long planId(String code) {
        return jdbc.queryForObject("select id from plans where code = ? and deleted_at is null", Long.class, code);
    }

    private Long moduleId(String code) {
        return jdbc.queryForObject("select id from modules where code = ? and deleted_at is null", Long.class, code);
    }
}
