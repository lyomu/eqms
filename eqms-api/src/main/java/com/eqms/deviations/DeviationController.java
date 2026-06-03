package com.eqms.deviations;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;
import com.eqms.deviations.dto.ApproveDeviationRequest;
import com.eqms.deviations.dto.CreateDeviationRequest;
import com.eqms.deviations.dto.DeviationResponse;
import com.eqms.deviations.dto.DeviationTransitionRequest;
import com.eqms.deviations.dto.UpdateDeviationRootCauseRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** Deviation REST API. Backend-guarded; transitions/signatures re-enforced in the service layer. */
@RestController
@RequestMapping("/api/deviations")
public class DeviationController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final DeviationService service;

    public DeviationController(DeviationService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<DeviationResponse> list(@RequestParam(required = false) DeviationStatus status, Pageable pageable) {
        Page<Deviation> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(DeviationResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DEVIATION_CREATE')")
    public ResponseEntity<DeviationResponse> create(@Valid @RequestBody CreateDeviationRequest request,
                                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Deviation d = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(DeviationResponse.from(d));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public DeviationResponse get(@PathVariable Long id) {
        return DeviationResponse.from(service.get(id));
    }

    @PutMapping("/{id}/root-cause")
    @PreAuthorize("hasAuthority('DEVIATION_CREATE')")
    public DeviationResponse updateRootCause(@PathVariable Long id, @Valid @RequestBody UpdateDeviationRootCauseRequest r,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.updateRootCause(id, r.expectedVersion(), r.rootCause(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-investigation")
    @PreAuthorize("hasAuthority('DEVIATION_CREATE')")
    public DeviationResponse submitForInvestigation(@PathVariable Long id, @Valid @RequestBody DeviationTransitionRequest r,
                                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.submitForInvestigation(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('DEVIATION_CREATE')")
    public DeviationResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody DeviationTransitionRequest r,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.submitForApproval(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('DEVIATION_APPROVE')")
    public DeviationResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveDeviationRequest r,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        DeviationResponse response = DeviationResponse.from(service.approve(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('DEVIATION_APPROVE')")
    public DeviationResponse reject(@PathVariable Long id, @Valid @RequestBody DeviationTransitionRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.reject(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('DEVIATION_APPROVE')")
    public DeviationResponse close(@PathVariable Long id, @Valid @RequestBody DeviationTransitionRequest r,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.close(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('DEVIATION_CREATE')")
    public DeviationResponse cancel(@PathVariable Long id, @Valid @RequestBody DeviationTransitionRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return DeviationResponse.from(service.cancel(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
