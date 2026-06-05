package com.eqms.oosmanagement;

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
import com.eqms.oosmanagement.dto.CloseOosCaseRequest;
import com.eqms.oosmanagement.dto.CreateCapaFromOosRequest;
import com.eqms.oosmanagement.dto.CreateOosCaseRequest;
import com.eqms.oosmanagement.dto.DetermineDispositionRequest;
import com.eqms.oosmanagement.dto.InitialAssessmentRequest;
import com.eqms.oosmanagement.dto.OosCaseResponse;
import com.eqms.oosmanagement.dto.OosTransitionRequest;
import com.eqms.oosmanagement.dto.RepeatResultRequest;
import com.eqms.oosmanagement.dto.RepeatTestingRequest;
import com.eqms.oosmanagement.dto.RootCauseAnalysisRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/oos")
public class OosCaseController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final OosCaseService service;

    public OosCaseController(OosCaseService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<OosCaseResponse> list(@RequestParam(required = false) OosStatus status,
                                              @RequestParam(required = false) Long productId,
                                              Pageable pageable) {
        Page<OosCase> page = service.list(status, productId, pageable);
        return PageResponse.from(page, page.getContent().stream().map(OosCaseResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<OosCaseResponse> create(@Valid @RequestBody CreateOosCaseRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        OosCase oos = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(oos));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public OosCaseResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse update(@PathVariable Long id, @Valid @RequestBody UpdateOosCaseRequest request,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/initial-assessment")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse initialAssessment(@PathVariable Long id, @Valid @RequestBody InitialAssessmentRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.initialAssessment(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/repeat-testing")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse repeatTesting(@PathVariable Long id, @Valid @RequestBody RepeatTestingRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.orderRepeatTesting(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/repeat-result")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse repeatResult(@PathVariable Long id, @Valid @RequestBody RepeatResultRequest request,
                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.recordRepeatResult(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/root-cause-analysis")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse rootCauseAnalysis(@PathVariable Long id, @Valid @RequestBody RootCauseAnalysisRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.rootCauseAnalysis(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/begin-investigation")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse beginInvestigation(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.beginInvestigation(id, request.expectedVersion(), null, request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/determine-disposition")
    @PreAuthorize("hasAuthority('OOS_APPROVE')")
    public OosCaseResponse determineDisposition(@PathVariable Long id,
                                                @Valid @RequestBody DetermineDispositionRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        OosCaseResponse response = detail(service.determineDisposition(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/create-capa")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<CapaResponse> createCapa(@PathVariable Long id,
                                                   @Valid @RequestBody CreateCapaFromOosRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(
                service.createCapa(id, request, p.getId(), p.getFullName(), ip(http), ua(http))));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('OOS_APPROVE')")
    public OosCaseResponse close(@PathVariable Long id, @Valid @RequestBody CloseOosCaseRequest request,
                                 @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        OosCaseResponse response = detail(service.close(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private OosCaseResponse detail(OosCase oos) {
        return OosCaseResponse.from(oos,
                service.getAssessment(oos.getId()),
                service.getRepeatTesting(oos.getId()),
                service.getInvestigation(oos.getId()),
                service.getDisposition(oos.getId()),
                service.getLinkedCapaIds(oos.getId()));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
