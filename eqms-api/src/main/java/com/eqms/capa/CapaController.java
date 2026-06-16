package com.eqms.capa;

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
import com.eqms.capa.dto.ApproveCapaRequest;
import com.eqms.capa.dto.CapaActionResponse;
import com.eqms.capa.dto.CapaResponse;
import com.eqms.capa.dto.CapaTransitionRequest;
import com.eqms.capa.dto.CloseCapaRequest;
import com.eqms.capa.dto.CreateCapaActionRequest;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.capa.dto.UpdateCapaDetailsRequest;
import com.eqms.capa.dto.UpdateRootCauseRequest;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** CAPA REST API. Every mutating endpoint is backend-guarded; transitions/signatures re-enforced in the service. */
@RestController
@RequestMapping("/api/capas")
public class CapaController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final CapaService service;

    public CapaController(CapaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<CapaResponse> list(@RequestParam(required = false) CapaStatus status, Pageable pageable) {
        Page<Capa> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(CapaResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public ResponseEntity<CapaResponse> create(@Valid @RequestBody CreateCapaRequest request,
                                               @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        Capa capa = service.create(request, principal.getId(), principal.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(capa));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public CapaResponse get(@PathVariable Long id) {
        return CapaResponse.from(service.get(id));
    }

    @PutMapping("/{id}/root-cause")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse updateRootCause(@PathVariable Long id, @Valid @RequestBody UpdateRootCauseRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return CapaResponse.from(service.updateRootCause(id, request.expectedVersion(), request.rootCause(),
                request.reason(), principal.getId(), principal.getFullName(), ip(http), ua(http)));
    }

    @PutMapping("/{id}/details")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse updateDetails(@PathVariable Long id, @Valid @RequestBody UpdateCapaDetailsRequest request,
                                      @AuthenticationPrincipal UserPrincipal principal, HttpServletRequest http) {
        return CapaResponse.from(service.updateDetails(id, request, principal.getId(), principal.getFullName(),
                ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-investigation")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse submitForInvestigation(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.submitForInvestigation(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.submitForApproval(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('CAPA_APPROVE')")
    public CapaResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveCapaRequest r,
                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        CapaResponse response = CapaResponse.from(service.approve(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('CAPA_APPROVE')")
    public CapaResponse reject(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.reject(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/start-actions")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse startActions(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.startActions(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-effectiveness")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse submitForEffectiveness(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.submitForEffectiveness(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('CAPA_APPROVE')")
    public CapaResponse close(@PathVariable Long id, @Valid @RequestBody CloseCapaRequest r,
                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        CapaResponse response = CapaResponse.from(service.close(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(), r.effectivenessResult(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaResponse cancel(@PathVariable Long id, @Valid @RequestBody CapaTransitionRequest r,
                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaResponse.from(service.cancel(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public ResponseEntity<CapaActionResponse> addAction(@PathVariable Long id, @Valid @RequestBody CreateCapaActionRequest r,
                                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        CapaAction action = service.addAction(id, r, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaActionResponse.from(action));
    }

    @PostMapping("/actions/{actionId}/complete")
    @PreAuthorize("hasAuthority('CAPA_CREATE')")
    public CapaActionResponse completeAction(@PathVariable Long actionId,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return CapaActionResponse.from(service.completeAction(actionId, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/actions")
    @PreAuthorize("isAuthenticated()")
    public List<CapaActionResponse> listActions(@PathVariable Long id) {
        return service.listActions(id).stream().map(CapaActionResponse::from).toList();
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
