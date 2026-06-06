package com.eqms.licensing;

import java.io.IOException;
import java.util.Map;

import org.hibernate.Session;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.eqms.auth.UserPrincipal;
import com.eqms.tenant.TenantContext;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class LicenseEnforcementInterceptor implements HandlerInterceptor {

    private static final Map<String, String> MODULE_PATHS = Map.ofEntries(
            Map.entry("/api/documents", "documents"),
            Map.entry("/api/training", "training"),
            Map.entry("/api/change-controls", "change_control"),
            Map.entry("/api/deviations", "deviations"),
            Map.entry("/api/capas", "capa"),
            Map.entry("/api/complaints", "complaints"),
            Map.entry("/api/audits", "audits"),
            Map.entry("/api/risks", "risk"),
            Map.entry("/api/equipment", "equipment"),
            Map.entry("/api/suppliers", "suppliers"),
            Map.entry("/api/materials", "materials"),
            Map.entry("/api/batch-records", "batch_records"),
            Map.entry("/api/products", "products"),
            Map.entry("/api/non-conformances", "non_conformance"),
            Map.entry("/api/oos", "oos"),
            Map.entry("/api/management-reviews", "management_review"),
            Map.entry("/api/reports", "reports")
    );

    private final LicenseService licenses;
    private final EntityManager entityManager;

    public LicenseEnforcementInterceptor(LicenseService licenses, EntityManager entityManager) {
        this.licenses = licenses;
        this.entityManager = entityManager;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        UserPrincipal principal = currentPrincipal();
        if (principal == null) {
            return true;
        }

        String path = request.getRequestURI();
        Long organizationId = principal.getOrganizationId();
        TenantContext.setOrganizationId(organizationId);
        if (organizationId != null && !path.startsWith("/api/platform")) {
            entityManager.unwrap(Session.class)
                    .enableFilter("organizationScope")
                    .setParameter("organizationId", organizationId);
        }

        if (path.startsWith("/api/auth") || path.startsWith("/api/platform") || path.startsWith("/actuator")) {
            return true;
        }

        if (licenses.isSuspended(organizationId)) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Organization license is suspended.");
            return false;
        }

        if (path.startsWith("/api/users") && isMutation(request)) {
            if (!licenses.canAddUser(organizationId)) {
                response.sendError(HttpStatus.PAYMENT_REQUIRED.value(), "User license limit reached.");
                return false;
            }
            return true;
        }

        String moduleCode = moduleFor(path);
        if (moduleCode == null) {
            return true;
        }

        if (!licenses.hasModuleAccess(organizationId, moduleCode)) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Module is not enabled for this organization.");
            return false;
        }

        if (isMutation(request) && !licenses.canCreateRecord(organizationId, moduleCode)) {
            response.sendError(HttpStatus.PAYMENT_REQUIRED.value(),
                    "Organization license is read-only. Existing records remain viewable.");
            return false;
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }

    private static boolean isMutation(HttpServletRequest request) {
        return !request.getMethod().equalsIgnoreCase("GET")
                && !request.getMethod().equalsIgnoreCase("HEAD")
                && !request.getMethod().equalsIgnoreCase("OPTIONS");
    }

    private static String moduleFor(String path) {
        return MODULE_PATHS.entrySet().stream()
                .filter(entry -> path.equals(entry.getKey()) || path.startsWith(entry.getKey() + "/"))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private static UserPrincipal currentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal;
    }
}
