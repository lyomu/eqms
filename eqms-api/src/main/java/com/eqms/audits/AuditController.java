package com.eqms.audits;

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

import com.eqms.audits.dto.AuditFindingResponse;
import com.eqms.audits.dto.AuditFollowUpResponse;
import com.eqms.audits.dto.AuditResponse;
import com.eqms.audits.dto.AuditTransitionRequest;
import com.eqms.audits.dto.CreateAuditRequest;
import com.eqms.audits.dto.CreateCapaFromFindingRequest;
import com.eqms.audits.dto.FinalizeAuditRequest;
import com.eqms.audits.dto.PlanAuditRequest;
import com.eqms.audits.dto.RecordFindingRequest;
import com.eqms.audits.dto.RecordFollowUpRequest;
import com.eqms.audits.dto.UpdateAuditRequest;
import com.eqms.auth.UserPrincipal;
import com.eqms.capa.dto.CapaResponse;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;
import com.eqms.notifications.NotificationDispatcher;
import com.eqms.notifications.NotificationType;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Audit Management REST API (quality audits). Every mutating endpoint carries a backend
 * {@code @PreAuthorize} guard; transitions and the finalize signature are re-enforced in the service.
 */
@RestController
@RequestMapping("/api/audits")
public class AuditController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final AuditManagementService service;
    private final NotificationDispatcher notifications;

    public AuditController(AuditManagementService service, NotificationDispatcher notifications) {
        this.service = service;
        this.notifications = notifications;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<AuditResponse> list(@RequestParam(required = false) AuditStatus status,
                                            @RequestParam(required = false) AuditType type,
                                            Pageable pageable) {
        Page<Audit> page = service.list(status, type, pageable);
        return PageResponse.from(page, page.getContent().stream().map(AuditResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditResponse> create(@Valid @RequestBody CreateAuditRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Audit a = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        notifications.dispatchToAuthority("AUDIT_VIEW", p.getId(),
                NotificationType.AUDIT_SCHEDULED,
                "Audit scheduled: " + a.getAuditNo(),
                "A quality audit (" + a.getAuditTitle() + ") has been scheduled.",
                "Audit", String.valueOf(a.getId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(a));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public AuditResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public AuditResponse update(@PathVariable Long id, @Valid @RequestBody UpdateAuditRequest request,
                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/plan")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public AuditResponse plan(@PathVariable Long id, @Valid @RequestBody PlanAuditRequest request,
                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.plan(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/record-finding")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditFindingResponse> recordFinding(@PathVariable Long id,
                                                              @Valid @RequestBody RecordFindingRequest request,
                                                              @AuthenticationPrincipal UserPrincipal p,
                                                              HttpServletRequest http) {
        AuditFinding f = service.recordFinding(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(AuditFindingResponse.from(f));
    }

    @GetMapping("/{id}/findings")
    @PreAuthorize("isAuthenticated()")
    public List<AuditFindingResponse> findings(@PathVariable Long id) {
        return service.findings(id).stream().map(AuditFindingResponse::from).toList();
    }

    @PostMapping("/{id}/create-capa")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<CapaResponse> createCapa(@PathVariable Long id,
                                                   @Valid @RequestBody CreateCapaFromFindingRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(
                service.createCapaFromFinding(id, request, p.getId(), p.getFullName(), ip(http), ua(http))));
    }

    @PostMapping("/{id}/finalize")
    @PreAuthorize("hasAuthority('AUDIT_APPROVE')")
    public AuditResponse finalizeAudit(@PathVariable Long id, @Valid @RequestBody FinalizeAuditRequest request,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        AuditResponse response = detail(service.finalizeAudit(id, request.expectedVersion(), request.reason(),
                request.password(), request.totpCode(), first, request.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/record-follow-up")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditFollowUpResponse> recordFollowUp(@PathVariable Long id,
                                                                @Valid @RequestBody RecordFollowUpRequest request,
                                                                @AuthenticationPrincipal UserPrincipal p,
                                                                HttpServletRequest http) {
        AuditFollowUp f = service.recordFollowUp(id, request.previousAuditId(), request.findingId(),
                request.status(), request.notes(), request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(AuditFollowUpResponse.from(f));
    }

    @GetMapping("/{id}/follow-up")
    @PreAuthorize("isAuthenticated()")
    public List<AuditFollowUpResponse> followUps(@PathVariable Long id) {
        return service.followUps(id).stream().map(AuditFollowUpResponse::from).toList();
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('AUDIT_MANAGE')")
    public AuditResponse cancel(@PathVariable Long id, @Valid @RequestBody AuditTransitionRequest request,
                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.cancel(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private AuditResponse detail(Audit a) {
        return AuditResponse.from(a,
                service.findings(a.getId()).stream().map(AuditFindingResponse::from).toList());
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
