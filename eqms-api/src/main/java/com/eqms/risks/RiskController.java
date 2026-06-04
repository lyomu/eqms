package com.eqms.risks;

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
import com.eqms.risks.dto.AcceptRiskRequest;
import com.eqms.risks.dto.CreateRiskRequest;
import com.eqms.risks.dto.HazardAnalysisRequest;
import com.eqms.risks.dto.ImplementControlsRequest;
import com.eqms.risks.dto.MitigationPlanRequest;
import com.eqms.risks.dto.RiskMitigationResponse;
import com.eqms.risks.dto.RiskResponse;
import com.eqms.risks.dto.RiskTransitionRequest;
import com.eqms.risks.dto.UpdateRiskRequest;
import com.eqms.risks.dto.VerifyEffectivenessRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Risk Management REST API. Every mutating endpoint carries a backend {@code @PreAuthorize} guard;
 * transitions and the acceptance signature are re-enforced in the service layer.
 */
@RestController
@RequestMapping("/api/risks")
public class RiskController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final RiskService service;

    public RiskController(RiskService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<RiskResponse> list(@RequestParam(required = false) RiskStatus status,
                                           @RequestParam(required = false) RiskCategory category,
                                           Pageable pageable) {
        Page<Risk> page = service.list(status, category, pageable);
        return PageResponse.from(page, page.getContent().stream().map(RiskResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public ResponseEntity<RiskResponse> create(@Valid @RequestBody CreateRiskRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Risk r = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(r));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public RiskResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public RiskResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRiskRequest request,
                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/hazard-analysis")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public RiskResponse hazardAnalysis(@PathVariable Long id, @Valid @RequestBody HazardAnalysisRequest request,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.hazardAnalysis(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/mitigation-plan")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public ResponseEntity<RiskMitigationResponse> mitigationPlan(@PathVariable Long id,
                                                                 @Valid @RequestBody MitigationPlanRequest request,
                                                                 @AuthenticationPrincipal UserPrincipal p,
                                                                 HttpServletRequest http) {
        RiskMitigation m = service.addMitigation(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(RiskMitigationResponse.from(m));
    }

    @PostMapping("/{id}/implement-controls")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public RiskResponse implementControls(@PathVariable Long id, @Valid @RequestBody ImplementControlsRequest request,
                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.implementControls(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/verify-effectiveness")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public RiskResponse verifyEffectiveness(@PathVariable Long id, @Valid @RequestBody VerifyEffectivenessRequest request,
                                            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.verifyEffectiveness(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasAuthority('RISK_APPROVE')")
    public RiskResponse accept(@PathVariable Long id, @Valid @RequestBody AcceptRiskRequest request,
                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        RiskResponse response = detail(service.accept(id, request.expectedVersion(), request.reason(),
                request.password(), request.totpCode(), first, request.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('RISK_APPROVE')")
    public RiskResponse close(@PathVariable Long id, @Valid @RequestBody RiskTransitionRequest request,
                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.close(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('RISK_CREATE')")
    public RiskResponse cancel(@PathVariable Long id, @Valid @RequestBody RiskTransitionRequest request,
                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.cancel(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/linked-changes")
    @PreAuthorize("isAuthenticated()")
    public List<Long> linkedChanges(@PathVariable Long id) {
        service.get(id); // 404 if the risk does not exist
        // Change Control does not yet carry a risk reference; this returns empty until that link
        // is added (changes that re-assess a risk will be surfaced here at that point).
        return List.of();
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private RiskResponse detail(Risk r) {
        return RiskResponse.from(r, service.getAnalysis(r.getId()),
                service.getMitigations(r.getId()), service.getEffectiveness(r.getId()));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
