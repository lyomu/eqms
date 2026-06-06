package com.eqms.admin.settings;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.eqms.auth.UserPrincipal;

@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('ADMIN')")
public class OrganizationAdminSettingsController {

    private final OrganizationAdminSettingsService service;

    public OrganizationAdminSettingsController(OrganizationAdminSettingsService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@AuthenticationPrincipal UserPrincipal principal) {
        UserPrincipal p = requireTenantPrincipal(principal);
        return Map.of(
                "general", service.section(p, "general"),
                "onboarding", service.section(p, "onboarding"),
                "security", service.section(p, "security"),
                "license", service.license(p)
        );
    }

    @GetMapping("/{section:general|onboarding|security|notifications|data-retention}")
    public Map<String, Object> section(@AuthenticationPrincipal UserPrincipal principal,
                                       @PathVariable String section) {
        return service.section(requireTenantPrincipal(principal), section);
    }

    @PutMapping("/{section:general|onboarding|security|notifications|data-retention}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> updateSection(@AuthenticationPrincipal UserPrincipal principal,
                                             @PathVariable String section,
                                             @RequestBody Map<String, Object> input,
                                             HttpServletRequest request) {
        return service.updateSection(requireTenantPrincipal(principal), section, input,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
    }

    @PatchMapping("/{section:general|onboarding|security|notifications|data-retention}")
    public Map<String, Object> patchSection(@AuthenticationPrincipal UserPrincipal principal,
                                            @PathVariable String section,
                                            @RequestBody Map<String, Object> input,
                                            HttpServletRequest request) {
        return updateSection(principal, section, input, request);
    }

    @GetMapping("/license")
    public Map<String, Object> license(@AuthenticationPrincipal UserPrincipal principal) {
        return service.license(requireTenantPrincipal(principal));
    }

    @GetMapping("/numbering")
    public List<Map<String, Object>> numbering(@AuthenticationPrincipal UserPrincipal principal) {
        return service.numbering(requireTenantPrincipal(principal));
    }

    @PutMapping("/numbering/{module}")
    public Map<String, Object> updateNumbering(@AuthenticationPrincipal UserPrincipal principal,
                                               @PathVariable String module,
                                               @RequestBody Map<String, Object> input,
                                               HttpServletRequest request) {
        return service.updateNumbering(requireTenantPrincipal(principal), module, input,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
    }

    @GetMapping("/notification-templates")
    public List<Map<String, Object>> notificationTemplates(@AuthenticationPrincipal UserPrincipal principal) {
        return service.notificationTemplates(requireTenantPrincipal(principal));
    }

    @PutMapping("/notification-templates/{eventType}")
    public Map<String, Object> updateTemplate(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable String eventType,
                                              @RequestBody Map<String, Object> input,
                                              HttpServletRequest request) {
        return service.updateTemplate(requireTenantPrincipal(principal), eventType, input,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
    }

    @GetMapping("/audit-log")
    public List<Map<String, Object>> auditLog(@AuthenticationPrincipal UserPrincipal principal) {
        return service.auditLog(requireTenantPrincipal(principal));
    }

    private UserPrincipal requireTenantPrincipal(UserPrincipal principal) {
        if (principal == null || principal.getOrganizationId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organization admin session required.");
        }
        return principal;
    }
}
