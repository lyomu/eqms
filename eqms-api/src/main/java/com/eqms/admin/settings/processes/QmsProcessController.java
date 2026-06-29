package com.eqms.admin.settings.processes;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.eqms.admin.settings.processes.dto.QmsProcessRequest;
import com.eqms.admin.settings.processes.dto.QmsProcessResponse;
import com.eqms.auth.UserPrincipal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/settings/processes")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.view') or hasAuthority('organization.settings.update')")
public class QmsProcessController {

    private final QmsProcessService service;

    public QmsProcessController(QmsProcessService service) {
        this.service = service;
    }

    @GetMapping
    public List<QmsProcessResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        UserPrincipal p = requirePrincipal(principal);
        return service.list(p.getOrganizationId()).stream().map(QmsProcessResponse::from).toList();
    }

    @GetMapping("/{id}")
    public QmsProcessResponse get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        UserPrincipal p = requirePrincipal(principal);
        return QmsProcessResponse.from(service.get(p.getOrganizationId(), id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.update')")
    public QmsProcessResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                     @Valid @RequestBody QmsProcessRequest request,
                                     HttpServletRequest http) {
        UserPrincipal p = requirePrincipal(principal);
        return QmsProcessResponse.from(service.create(p.getOrganizationId(), request,
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.update')")
    public QmsProcessResponse update(@AuthenticationPrincipal UserPrincipal principal,
                                     @PathVariable Long id,
                                     @Valid @RequestBody QmsProcessRequest request,
                                     HttpServletRequest http) {
        UserPrincipal p = requirePrincipal(principal);
        return QmsProcessResponse.from(service.update(p.getOrganizationId(), id, request,
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    private UserPrincipal requirePrincipal(UserPrincipal principal) {
        if (principal == null || principal.getOrganizationId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organization admin session required.");
        }
        return principal;
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
