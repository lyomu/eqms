package com.eqms.complaints;

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
import com.eqms.capa.dto.CapaResponse;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;
import com.eqms.complaints.dto.ComplaintResponse;
import com.eqms.complaints.dto.ComplaintTransitionRequest;
import com.eqms.complaints.dto.CreateCapaFromComplaintRequest;
import com.eqms.complaints.dto.CreateComplaintRequest;
import com.eqms.complaints.dto.ImpactAssessmentRequest;
import com.eqms.complaints.dto.InvestigateRequest;
import com.eqms.complaints.dto.LinkCapaRequest;
import com.eqms.complaints.dto.ResolveComplaintRequest;
import com.eqms.complaints.dto.RootCauseRequest;
import com.eqms.complaints.dto.SignedTransitionRequest;
import com.eqms.complaints.dto.UpdateComplaintRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Complaint Management REST API. Every mutating endpoint carries a backend {@code @PreAuthorize}
 * guard; transitions and signatures are re-enforced in the service via WorkflowService/SignatureService.
 */
@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<ComplaintResponse> list(@RequestParam(required = false) ComplaintStatus status,
                                                @RequestParam(required = false) ComplaintSource source,
                                                @RequestParam(required = false) ComplaintSeverity severity,
                                                Pageable pageable) {
        Page<Complaint> page = service.list(status, source, severity, pageable);
        return PageResponse.from(page, page.getContent().stream().map(ComplaintResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ResponseEntity<ComplaintResponse> create(@Valid @RequestBody CreateComplaintRequest request,
                                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Complaint c = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(c));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ComplaintResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ComplaintResponse update(@PathVariable Long id, @Valid @RequestBody UpdateComplaintRequest request,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAuthority('COMPLAINT_APPROVE')")
    public ComplaintResponse acknowledge(@PathVariable Long id, @Valid @RequestBody SignedTransitionRequest r,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        ComplaintResponse response = detail(service.acknowledge(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/investigate")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ComplaintResponse investigate(@PathVariable Long id, @Valid @RequestBody InvestigateRequest r,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.investigate(id, r.expectedVersion(), r.investigationFindings(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/root-cause-analysis")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ComplaintResponse rootCauseAnalysis(@PathVariable Long id, @Valid @RequestBody RootCauseRequest r,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.recordRootCause(id, r.rootCause(), r.rootCauseMethod(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/impact-assessment")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ComplaintResponse impactAssessment(@PathVariable Long id, @Valid @RequestBody ImpactAssessmentRequest r,
                                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.recordImpact(id, r.impactOnProduct(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/create-capa")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ResponseEntity<CapaResponse> createCapa(@PathVariable Long id,
                                                   @Valid @RequestBody CreateCapaFromComplaintRequest r,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(
                service.createCapa(id, r, p.getId(), p.getFullName(), ip(http), ua(http))));
    }

    @PostMapping("/{id}/link-capa")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ResponseEntity<Void> linkCapa(@PathVariable Long id, @Valid @RequestBody LinkCapaRequest r,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.linkCapa(id, r.capaId(), r.reason(), p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/resolution")
    @PreAuthorize("hasAuthority('COMPLAINT_CREATE')")
    public ComplaintResponse resolve(@PathVariable Long id, @Valid @RequestBody ResolveComplaintRequest r,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.resolve(id, r.expectedVersion(), r.resolutionDescription(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('COMPLAINT_APPROVE')")
    public ComplaintResponse close(@PathVariable Long id, @Valid @RequestBody SignedTransitionRequest r,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        ComplaintResponse response = detail(service.close(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('COMPLAINT_APPROVE')")
    public ComplaintResponse cancel(@PathVariable Long id, @Valid @RequestBody ComplaintTransitionRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.cancel(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private ComplaintResponse detail(Complaint c) {
        return ComplaintResponse.from(c,
                service.getInvestigation(c.getId()),
                service.getResolution(c.getId()),
                service.getLinkedCapaIds(c.getId()));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
