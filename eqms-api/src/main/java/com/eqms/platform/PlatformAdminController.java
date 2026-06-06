package com.eqms.platform;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;

@RestController
@RequestMapping("/api/platform")
@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")
public class PlatformAdminController {

    private final PlatformAdminService service;

    public PlatformAdminController(PlatformAdminService service) {
        this.service = service;
    }

    @PostMapping("/organizations")
    public Map<String, Object> createOrganization(@RequestBody OrganizationRequest request) {
        return service.createOrganization(request, principal());
    }

    @GetMapping("/organizations")
    public List<Map<String, Object>> organizations() {
        return service.organizations();
    }

    @GetMapping("/organizations/{id}")
    public Map<String, Object> organization(@PathVariable Long id) {
        return service.organization(id);
    }

    @PatchMapping("/organizations/{id}")
    public Map<String, Object> updateOrganization(@PathVariable Long id, @RequestBody OrganizationRequest request) {
        return service.updateOrganization(id, request, principal());
    }

    @PostMapping("/organizations/{id}/suspend")
    public Map<String, Object> suspend(@PathVariable Long id) {
        return service.suspend(id, principal());
    }

    @PostMapping("/organizations/{id}/reactivate")
    public Map<String, Object> reactivate(@PathVariable Long id) {
        return service.reactivate(id, principal());
    }

    @PostMapping("/organizations/{id}/change-plan")
    public Map<String, Object> changePlan(@PathVariable Long id, @RequestBody ChangePlanRequest request) {
        return service.changePlan(id, request, principal());
    }

    @PostMapping("/organizations/{id}/enable-module")
    public Map<String, Object> enableModule(@PathVariable Long id, @RequestBody ModuleToggleRequest request) {
        return service.setModule(id, request, true, principal());
    }

    @PostMapping("/organizations/{id}/disable-module")
    public Map<String, Object> disableModule(@PathVariable Long id, @RequestBody ModuleToggleRequest request) {
        return service.setModule(id, request, false, principal());
    }

    @GetMapping("/plans")
    public List<Map<String, Object>> plans() {
        return service.plans();
    }

    @PostMapping("/plans")
    public Map<String, Object> createPlan(@RequestBody PlanRequest request) {
        return service.createPlan(request, principal());
    }

    @PatchMapping("/plans/{id}")
    public Map<String, Object> updatePlan(@PathVariable Long id, @RequestBody PlanRequest request) {
        return service.updatePlan(id, request, principal());
    }

    @GetMapping("/modules")
    public List<Map<String, Object>> modules() {
        return service.modules();
    }

    private static UserPrincipal principal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Platform admin session required");
        }
        return principal;
    }
}
