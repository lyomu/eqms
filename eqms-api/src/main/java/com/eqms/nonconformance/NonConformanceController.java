package com.eqms.nonconformance;

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
import com.eqms.nonconformance.dto.CloseNcRequest;
import com.eqms.nonconformance.dto.CreateCapaFromNcRequest;
import com.eqms.nonconformance.dto.CreateNonConformanceRequest;
import com.eqms.nonconformance.dto.DetermineNcDispositionRequest;
import com.eqms.nonconformance.dto.ImplementActionRequest;
import com.eqms.nonconformance.dto.InvestigateNcRequest;
import com.eqms.nonconformance.dto.NonConformanceResponse;
import com.eqms.nonconformance.dto.UpdateNonConformanceRequest;
import com.eqms.nonconformance.dto.UseAsIsApprovalRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/non-conformances")
public class NonConformanceController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final NonConformanceService service;

    public NonConformanceController(NonConformanceService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<NonConformanceResponse> list(@RequestParam(required = false) NcStatus status,
                                                     @RequestParam(required = false) NcType type,
                                                     Pageable pageable) {
        Page<NonConformance> page = service.list(status, type, pageable);
        return PageResponse.from(page, page.getContent().stream().map(NonConformanceResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public ResponseEntity<NonConformanceResponse> create(@Valid @RequestBody CreateNonConformanceRequest request,
                                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        NonConformance nc = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(nc));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public NonConformanceResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public NonConformanceResponse update(@PathVariable Long id, @Valid @RequestBody UpdateNonConformanceRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/investigate")
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public NonConformanceResponse investigate(@PathVariable Long id, @Valid @RequestBody InvestigateNcRequest request,
                                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.investigate(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/request-approval")
    @PreAuthorize("hasAuthority('NC_APPROVE')")
    public NonConformanceResponse requestApproval(@PathVariable Long id, @Valid @RequestBody UseAsIsApprovalRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        service.requestUseAsIsApproval(id, request, first, p.getId(), p.getFullName(), ip(http), ua(http));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return detail(service.get(id));
    }

    @PostMapping("/{id}/approve-use-as-is")
    @PreAuthorize("hasAuthority('NC_APPROVE')")
    public NonConformanceResponse approveUseAsIs(@PathVariable Long id, @Valid @RequestBody UseAsIsApprovalRequest request,
                                                 @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return requestApproval(id, request, p, http);
    }

    @PostMapping("/{id}/determine-disposition")
    @PreAuthorize("hasAuthority('NC_APPROVE')")
    public NonConformanceResponse determineDisposition(@PathVariable Long id,
                                                       @Valid @RequestBody DetermineNcDispositionRequest request,
                                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        NonConformanceResponse response = detail(service.determineDisposition(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/implement-action")
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public NonConformanceResponse implementAction(@PathVariable Long id, @Valid @RequestBody ImplementActionRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.implementAction(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/verify-rework")
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public NonConformanceResponse verifyRework(@PathVariable Long id, @Valid @RequestBody ImplementActionRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return implementAction(id, request, p, http);
    }

    @PostMapping("/{id}/create-capa")
    @PreAuthorize("hasAuthority('NC_CREATE')")
    public ResponseEntity<CapaResponse> createCapa(@PathVariable Long id,
                                                   @Valid @RequestBody CreateCapaFromNcRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(
                service.createCapa(id, request, p.getId(), p.getFullName(), ip(http), ua(http))));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('NC_APPROVE')")
    public NonConformanceResponse close(@PathVariable Long id, @Valid @RequestBody CloseNcRequest request,
                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        NonConformanceResponse response = detail(service.close(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private NonConformanceResponse detail(NonConformance nc) {
        return NonConformanceResponse.from(nc,
                service.getInvestigation(nc.getId()),
                service.getDisposition(nc.getId()),
                service.getUseAsIsApproval(nc.getId()),
                service.getLinkedCapaIds(nc.getId()));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
