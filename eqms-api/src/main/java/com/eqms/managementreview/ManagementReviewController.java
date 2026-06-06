package com.eqms.managementreview;

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
import com.eqms.managementreview.dto.ActionItemResponse;
import com.eqms.managementreview.dto.AddActionItemRequest;
import com.eqms.managementreview.dto.AddAuditResultRequest;
import com.eqms.managementreview.dto.AddMetricRequest;
import com.eqms.managementreview.dto.AddProductFeedbackRequest;
import com.eqms.managementreview.dto.ApproveReviewRequest;
import com.eqms.managementreview.dto.CreateManagementReviewRequest;
import com.eqms.managementreview.dto.ManagementReviewResponse;
import com.eqms.managementreview.dto.RecordDecisionRequest;
import com.eqms.managementreview.dto.ReviewReportResponse;
import com.eqms.managementreview.dto.UpdateManagementReviewRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/management-reviews")
public class ManagementReviewController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final ManagementReviewService service;

    public ManagementReviewController(ManagementReviewService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<ManagementReviewResponse> list(@RequestParam(required = false) MrStatus status,
                                                       Pageable pageable) {
        Page<ManagementReview> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(ManagementReviewResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ResponseEntity<ManagementReviewResponse> create(@Valid @RequestBody CreateManagementReviewRequest request,
                                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        ManagementReview review = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(review));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ManagementReviewResponse get(@PathVariable Long id) {
        return detail(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse update(@PathVariable Long id, @Valid @RequestBody UpdateManagementReviewRequest request,
                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/add-metrics")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse addMetrics(@PathVariable Long id, @Valid @RequestBody AddMetricRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.addMetric(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/add-audit-results")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse addAuditResults(@PathVariable Long id, @Valid @RequestBody AddAuditResultRequest request,
                                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.addAuditResult(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/add-product-feedback")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse addProductFeedback(@PathVariable Long id, @Valid @RequestBody AddProductFeedbackRequest request,
                                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.addProductFeedback(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/add-action-items")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse addActionItems(@PathVariable Long id, @Valid @RequestBody AddActionItemRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.addActionItem(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/add-action-item")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse addActionItem(@PathVariable Long id, @Valid @RequestBody AddActionItemRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return addActionItems(id, request, p, http);
    }

    @PostMapping("/{id}/record-decision")
    @PreAuthorize("hasAuthority('MR_MANAGE')")
    public ManagementReviewResponse recordDecision(@PathVariable Long id, @Valid @RequestBody RecordDecisionRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.recordDecision(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('MR_APPROVE')")
    public ManagementReviewResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveReviewRequest request,
                                            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        ManagementReviewResponse response = detail(service.approve(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/approve-and-finalize")
    @PreAuthorize("hasAuthority('MR_APPROVE')")
    public ManagementReviewResponse approveAndFinalize(@PathVariable Long id, @Valid @RequestBody ApproveReviewRequest request,
                                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return approve(id, request, p, http);
    }

    @GetMapping("/{id}/previous-actions")
    @PreAuthorize("isAuthenticated()")
    public List<ActionItemResponse> previousActions(@PathVariable Long id) {
        return service.previousActions(id).stream().map(ActionItemResponse::from).toList();
    }

    @GetMapping("/{id}/generated-reports")
    @PreAuthorize("isAuthenticated()")
    public ReviewReportResponse generatedReports(@PathVariable Long id) {
        return service.generateReport(id);
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private ManagementReviewResponse detail(ManagementReview review) {
        Long id = review.getId();
        return ManagementReviewResponse.from(review,
                service.getMetrics(id), service.getAuditResults(id), service.getProductFeedback(id),
                service.getActionItems(id), service.getDecisions(id));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
