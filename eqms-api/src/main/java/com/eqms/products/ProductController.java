package com.eqms.products;

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
import com.eqms.common.dto.IsoReadinessResponse;
import com.eqms.common.dto.PageResponse;
import com.eqms.products.dto.ApproveProductRequest;
import com.eqms.products.dto.CreateProductRequest;
import com.eqms.products.dto.ProductApprovalHistoryResponse;
import com.eqms.products.dto.ProductEvidenceRequest;
import com.eqms.products.dto.ProductEvidenceResponse;
import com.eqms.products.dto.ProductResponse;
import com.eqms.products.dto.ProductSummaryResponse;
import com.eqms.products.dto.ProductTransitionRequest;
import com.eqms.products.dto.ProductTraceabilityResponse;
import com.eqms.products.dto.UpdateProductRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** Product Management REST API. Backend-guarded; transitions/signatures re-enforced in the service. */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<ProductResponse> list(@RequestParam(required = false) ProductStatus status,
                                              @RequestParam(required = false) String search,
                                              @RequestParam(required = false) String productType,
                                              @RequestParam(required = false) String category,
                                              @RequestParam(required = false) ProductCriticality criticality,
                                              @RequestParam(required = false) Long ownerId,
                                              @RequestParam(required = false) String specificationStatus,
                                              @RequestParam(required = false) Boolean dueForReview,
                                              @RequestParam(required = false) Boolean openQualityIssues,
                                              Pageable pageable) {
        Page<Product> page = service.list(status, search, productType, category, criticality, ownerId,
                specificationStatus, dueForReview, openQualityIssues, pageable);
        return PageResponse.from(page, page.getContent().stream().map(ProductResponse::from).toList());
    }

    @GetMapping("/summary")
    @PreAuthorize("isAuthenticated()")
    public ProductSummaryResponse summary() {
        return service.summary();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCT_CREATE')")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Product product = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(product));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ProductResponse get(@PathVariable Long id) {
        return ProductResponse.from(service.get(id));
    }

    @GetMapping("/{id}/iso-readiness")
    @PreAuthorize("isAuthenticated()")
    public IsoReadinessResponse isoReadiness(@PathVariable Long id) {
        return service.isoReadiness(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCT_CREATE')")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody UpdateProductRequest request,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('PRODUCT_CREATE')")
    public ProductResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.submitForApproval(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE','PRODUCT_SUBMIT')")
    public ProductResponse submit(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return submitForApproval(id, r, p, http);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveProductRequest r,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        ProductResponse response = ProductResponse.from(service.approve(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse reject(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.reject(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/put-on-hold")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse putOnHold(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.putOnHold(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse suspend(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return putOnHold(id, r, p, http);
    }

    @PostMapping("/{id}/resume")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse resume(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.resume(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/discontinue")
    @PreAuthorize("hasAuthority('PRODUCT_APPROVE')")
    public ProductResponse discontinue(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.discontinue(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/obsolete")
    @PreAuthorize("hasAnyAuthority('PRODUCT_APPROVE','PRODUCT_ARCHIVE')")
    public ProductResponse obsolete(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return discontinue(id, r, p, http);
    }

    @PostMapping("/{id}/revise")
    @PreAuthorize("hasAnyAuthority('PRODUCT_APPROVE','PRODUCT_REVISE')")
    public ProductResponse revise(@PathVariable Long id, @Valid @RequestBody ProductTransitionRequest r,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ProductResponse.from(service.revise(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/{section:specifications|materials|process|qc-requirements|documents|quality-issues|risks|change-control}")
    @PreAuthorize("isAuthenticated()")
    public List<ProductEvidenceResponse> evidence(@PathVariable Long id, @PathVariable String section) {
        return service.evidence(id, section);
    }

    @PostMapping("/{id}/{section:specifications|materials|process|qc-requirements|documents|quality-issues|risks|change-control}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE','PRODUCT_DOCUMENTS_MANAGE','PRODUCT_MATERIALS_MANAGE','PRODUCT_QUALITY_LINKS_MANAGE')")
    public ProductEvidenceResponse addEvidence(@PathVariable Long id, @PathVariable String section,
                                               @RequestBody ProductEvidenceRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return service.addEvidence(id, section, request, p.getId(), p.getFullName(), ip(http), ua(http));
    }

    @GetMapping("/{id}/batches")
    @PreAuthorize("isAuthenticated()")
    public List<ProductEvidenceResponse> batches(@PathVariable Long id) {
        return service.batches(id);
    }

    @GetMapping("/{id}/traceability")
    @PreAuthorize("hasAnyAuthority('PRODUCT_TRACEABILITY_VIEW','AUDIT_VIEW')")
    public ProductTraceabilityResponse traceability(@PathVariable Long id) {
        return service.traceability(id);
    }

    @GetMapping("/{id}/approval-history")
    @PreAuthorize("isAuthenticated()")
    public List<ProductApprovalHistoryResponse> approvalHistory(@PathVariable Long id) {
        return service.approvalHistory(id);
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAnyAuthority('AUDIT_VIEW','PRODUCT_AUDIT_TRAIL_VIEW')")
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
