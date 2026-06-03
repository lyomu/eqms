package com.eqms.changecontrol;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.changecontrol.dto.ApproveChangeRequest;
import com.eqms.changecontrol.dto.ChangeActionRequest;
import com.eqms.changecontrol.dto.ChangeControlResponse;
import com.eqms.changecontrol.dto.CreateChangeControlRequest;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Change Control REST API. Every mutating endpoint carries a backend {@code @PreAuthorize} guard;
 * transitions/signatures are enforced again in the service layer via WorkflowService/SignatureService.
 */
@RestController
@RequestMapping("/api/change-controls")
public class ChangeControlController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final ChangeControlService service;

    public ChangeControlController(ChangeControlService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<ChangeControlResponse> list(@RequestParam(required = false) ChangeControlStatus status,
                                                    Pageable pageable) {
        Page<ChangeControl> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(ChangeControlResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ResponseEntity<ChangeControlResponse> create(@Valid @RequestBody CreateChangeControlRequest request,
                                                        @AuthenticationPrincipal UserPrincipal principal,
                                                        HttpServletRequest http) {
        ChangeControl cc = service.create(request, principal.getId(), principal.getFullName(),
                clientIp(http), userAgent(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(ChangeControlResponse.from(cc));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ChangeControlResponse get(@PathVariable Long id) {
        return ChangeControlResponse.from(service.get(id));
    }

    @PostMapping("/{id}/submit-for-review")
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ChangeControlResponse submitForReview(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.submitForReview(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('CHANGE_APPROVE')")
    public ChangeControlResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                                   @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.submitForApproval(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('CHANGE_APPROVE')")
    public ChangeControlResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveChangeRequest request,
                                         @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        ChangeControlResponse response = ChangeControlResponse.from(service.approve(id, request.expectedVersion(),
                request.reason(), request.password(), request.totpCode(), first, request.meaningStatement(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('CHANGE_APPROVE')")
    public ChangeControlResponse reject(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.reject(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/start-implementation")
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ChangeControlResponse startImplementation(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.startImplementation(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/complete-implementation")
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ChangeControlResponse completeImplementation(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                                        @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.completeImplementation(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/submit-for-closure")
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ChangeControlResponse submitForClosure(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.submitForClosure(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('CHANGE_APPROVE')")
    public ChangeControlResponse close(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                       @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.close(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('CHANGE_CREATE')")
    public ChangeControlResponse cancel(@PathVariable Long id, @Valid @RequestBody ChangeActionRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return ChangeControlResponse.from(service.cancel(id, request.expectedVersion(), request.reason(),
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
