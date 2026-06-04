package com.eqms.suppliers;

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
import com.eqms.suppliers.dto.ConditionalRequest;
import com.eqms.suppliers.dto.CreateCapaFromFindingRequest;
import com.eqms.suppliers.dto.CreateSupplierRequest;
import com.eqms.suppliers.dto.IssueFindingRequest;
import com.eqms.suppliers.dto.QualifySupplierRequest;
import com.eqms.suppliers.dto.RecordAuditRequest;
import com.eqms.suppliers.dto.RecordPerformanceRequest;
import com.eqms.suppliers.dto.SupplierCertificationResponse;
import com.eqms.suppliers.dto.SupplierFindingResponse;
import com.eqms.suppliers.dto.SupplierPerformanceResponse;
import com.eqms.suppliers.dto.SupplierQualificationResponse;
import com.eqms.suppliers.dto.SupplierResponse;
import com.eqms.suppliers.dto.UpdateSupplierRequest;
import com.eqms.suppliers.dto.UploadCertificateRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** Supplier Quality REST API. Mutating endpoints are backend-guarded; qualify is signature-gated. */
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final SupplierService service;

    public SupplierController(SupplierService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<SupplierResponse> list(@RequestParam(required = false) SupplierStatus status, Pageable pageable) {
        Page<Supplier> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(SupplierResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody CreateSupplierRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Supplier s = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(SupplierResponse.from(s));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public SupplierResponse get(@PathVariable Long id) {
        return SupplierResponse.from(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody UpdateSupplierRequest request,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return SupplierResponse.from(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/qualify")
    @PreAuthorize("hasAuthority('SUPPLIER_APPROVE')")
    public SupplierResponse qualify(@PathVariable Long id, @Valid @RequestBody QualifySupplierRequest request,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        SupplierResponse response = SupplierResponse.from(service.qualify(id, request.expectedVersion(),
                request.assessmentMethod(), request.notes(), request.reason(),
                request.password(), request.totpCode(), first, request.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/conditional")
    @PreAuthorize("hasAuthority('SUPPLIER_APPROVE')")
    public SupplierResponse conditional(@PathVariable Long id, @Valid @RequestBody ConditionalRequest request,
                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return SupplierResponse.from(service.makeConditional(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/audit")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<SupplierQualificationResponse> recordAudit(@PathVariable Long id,
                                                                     @Valid @RequestBody RecordAuditRequest request,
                                                                     @AuthenticationPrincipal UserPrincipal p,
                                                                     HttpServletRequest http) {
        SupplierQualification q = service.recordAudit(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(SupplierQualificationResponse.from(q));
    }

    @PostMapping("/{id}/upload-certificate")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<SupplierCertificationResponse> uploadCertificate(@PathVariable Long id,
                                                                           @Valid @RequestBody UploadCertificateRequest request,
                                                                           @AuthenticationPrincipal UserPrincipal p,
                                                                           HttpServletRequest http) {
        SupplierCertification c = service.uploadCertificate(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(SupplierCertificationResponse.from(c));
    }

    @PostMapping("/{id}/record-performance")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<SupplierPerformanceResponse> recordPerformance(@PathVariable Long id,
                                                                         @Valid @RequestBody RecordPerformanceRequest request,
                                                                         @AuthenticationPrincipal UserPrincipal p,
                                                                         HttpServletRequest http) {
        SupplierPerformance pf = service.recordPerformance(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(SupplierPerformanceResponse.from(pf));
    }

    @PostMapping("/{id}/issue-finding")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<SupplierFindingResponse> issueFinding(@PathVariable Long id,
                                                                @Valid @RequestBody IssueFindingRequest request,
                                                                @AuthenticationPrincipal UserPrincipal p,
                                                                HttpServletRequest http) {
        SupplierFinding f = service.issueFinding(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(SupplierFindingResponse.from(f));
    }

    @PostMapping("/{id}/create-capa")
    @PreAuthorize("hasAuthority('SUPPLIER_CREATE')")
    public ResponseEntity<CapaResponse> createCapa(@PathVariable Long id,
                                                   @Valid @RequestBody CreateCapaFromFindingRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED).body(CapaResponse.from(
                service.createCapaFromFinding(id, request, p.getId(), p.getFullName(), ip(http), ua(http))));
    }

    @GetMapping("/{id}/certifications")
    @PreAuthorize("isAuthenticated()")
    public List<SupplierCertificationResponse> certifications(@PathVariable Long id) {
        return service.certifications(id).stream().map(SupplierCertificationResponse::from).toList();
    }

    @GetMapping("/{id}/performance-history")
    @PreAuthorize("isAuthenticated()")
    public List<SupplierPerformanceResponse> performanceHistory(@PathVariable Long id) {
        return service.performanceHistory(id).stream().map(SupplierPerformanceResponse::from).toList();
    }

    @GetMapping("/{id}/audit-history")
    @PreAuthorize("isAuthenticated()")
    public List<SupplierQualificationResponse> auditHistory(@PathVariable Long id) {
        return service.auditHistory(id).stream().map(SupplierQualificationResponse::from).toList();
    }

    @GetMapping("/{id}/findings")
    @PreAuthorize("isAuthenticated()")
    public List<SupplierFindingResponse> findings(@PathVariable Long id) {
        return service.findings(id).stream().map(SupplierFindingResponse::from).toList();
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
