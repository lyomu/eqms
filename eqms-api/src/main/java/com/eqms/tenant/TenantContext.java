package com.eqms.tenant;

/** Request-local tenant context. Organization IDs come from authenticated users, never clients. */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_ORGANIZATION = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setOrganizationId(Long organizationId) {
        CURRENT_ORGANIZATION.set(organizationId);
    }

    public static Long getOrganizationId() {
        return CURRENT_ORGANIZATION.get();
    }

    public static void clear() {
        CURRENT_ORGANIZATION.remove();
    }
}
