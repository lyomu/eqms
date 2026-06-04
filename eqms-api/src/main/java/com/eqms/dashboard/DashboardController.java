package com.eqms.dashboard;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.dashboard.dto.ComplianceStatus;
import com.eqms.dashboard.dto.DashboardStatistics;
import com.eqms.dashboard.dto.MyWork;
import com.eqms.dashboard.dto.PendingApprovals;
import com.eqms.dashboard.dto.TaskItem;

/** Dashboard REST API. All endpoints are read-only and scoped to the authenticated user where relevant. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/my-work")
    @PreAuthorize("isAuthenticated()")
    public MyWork myWork(@AuthenticationPrincipal UserPrincipal p) {
        return service.myWork(p.getId(), authorities(p));
    }

    @GetMapping("/my-approvals")
    @PreAuthorize("isAuthenticated()")
    public PendingApprovals myApprovals(@AuthenticationPrincipal UserPrincipal p) {
        return service.myApprovals(p.getId(), authorities(p));
    }

    @GetMapping("/my-tasks")
    @PreAuthorize("isAuthenticated()")
    public List<TaskItem> myTasks(@AuthenticationPrincipal UserPrincipal p) {
        return service.myTasks(p.getId());
    }

    @GetMapping("/overdue-items")
    @PreAuthorize("isAuthenticated()")
    public List<TaskItem> overdueItems() {
        return service.overdueItems();
    }

    @GetMapping("/due-soon")
    @PreAuthorize("isAuthenticated()")
    public List<TaskItem> dueSoon() {
        return service.dueSoon();
    }

    @GetMapping("/statistics")
    @PreAuthorize("isAuthenticated()")
    public DashboardStatistics statistics() {
        return service.statistics();
    }

    @GetMapping("/compliance-status")
    @PreAuthorize("isAuthenticated()")
    public ComplianceStatus complianceStatus() {
        return service.complianceStatus();
    }

    private static List<String> authorities(UserPrincipal p) {
        return p.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    }
}
