package com.eqms.oosmanagement;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import com.eqms.oosmanagement.dto.AddEvidenceRequest;
import com.eqms.oosmanagement.dto.AddInvestigationItemRequest;
import com.eqms.oosmanagement.dto.AddLinkedRecordRequest;
import com.eqms.oosmanagement.dto.AddRetestResampleRequest;
import com.eqms.oosmanagement.dto.CloseOosCaseRequest;
import com.eqms.oosmanagement.dto.CreateCapaFromOosRequest;
import com.eqms.oosmanagement.dto.CreateOosCaseRequest;
import com.eqms.oosmanagement.dto.DetermineDispositionRequest;
import com.eqms.oosmanagement.dto.InitialAssessmentRequest;
import com.eqms.oosmanagement.dto.OosCaseResponse;
import com.eqms.oosmanagement.dto.OosTransitionRequest;
import com.eqms.oosmanagement.dto.QaReviewDecisionRequest;
import com.eqms.oosmanagement.dto.ReopenCaseRequest;
import com.eqms.oosmanagement.dto.RepeatResultRequest;
import com.eqms.oosmanagement.dto.RepeatTestingRequest;
import com.eqms.oosmanagement.dto.RootCauseAnalysisRequest;
import com.eqms.oosmanagement.dto.SaveContainmentRequest;
import com.eqms.oosmanagement.dto.SaveImpactAssessmentRequest;
import com.eqms.oosmanagement.dto.SaveInvestigationRequest;
import com.eqms.oosmanagement.dto.SaveLabAssessmentRequest;
import com.eqms.oosmanagement.dto.SaveRootCauseRequest;
import com.eqms.oosmanagement.dto.UpdateInvestigationItemRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseDetailsRequest;
import com.eqms.oosmanagement.dto.UpdateOosCaseRequest;
import com.eqms.oosmanagement.dto.UpdateRetestResampleRequest;

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

    // ========================================================================================
    // Core CRUD
    // ========================================================================================

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

    @PutMapping("/{id}/details")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse updateDetails(@PathVariable Long id, @Valid @RequestBody UpdateOosCaseDetailsRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.updateDetails(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    // ========================================================================================
    // Existing workflow actions (preserved)
    // ========================================================================================

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

    // ========================================================================================
    // New workflow transitions
    // ========================================================================================

    @PostMapping("/{id}/lab-assessment")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse labAssessment(@PathVariable Long id, @Valid @RequestBody SaveLabAssessmentRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.saveLabAssessment(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/submit-for-qa-review")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosCaseResponse submitForQaReview(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.submitForQaReview(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/qa-order-retest")
    @PreAuthorize("hasAuthority('OOS_RETEST_APPROVE')")
    public OosCaseResponse qaOrderRetest(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.qaOrderRetest(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/qa-order-resample")
    @PreAuthorize("hasAuthority('OOS_RETEST_APPROVE')")
    public OosCaseResponse qaOrderResample(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.qaOrderResample(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/qa-approve-investigation")
    @PreAuthorize("hasAuthority('OOS_DISPOSE')")
    public OosCaseResponse qaApproveInvestigation(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.qaApproveInvestigation(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/require-capa")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosCaseResponse requireCapa(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.requireCapa(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/capa-complete-proceed")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosCaseResponse capaCompleteProceed(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.capaCompleteProceed(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/qa-dispose")
    @PreAuthorize("hasAuthority('OOS_DISPOSE')")
    public OosCaseResponse qaDispose(@PathVariable Long id, @Valid @RequestBody DetermineDispositionRequest request,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        OosCaseResponse response = detail(service.qaDispose(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('OOS_REOPEN')")
    public OosCaseResponse reopen(@PathVariable Long id, @Valid @RequestBody ReopenCaseRequest request,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        OosCaseResponse response = detail(service.reopen(id, request, first,
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse cancel(@PathVariable Long id, @Valid @RequestBody OosTransitionRequest request,
                                  @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.cancel(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    // ========================================================================================
    // Containment
    // ========================================================================================

    @PostMapping("/{id}/containment")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public OosCaseResponse saveContainment(@PathVariable Long id, @Valid @RequestBody SaveContainmentRequest request,
                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.saveContainment(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @GetMapping("/{id}/containment")
    @PreAuthorize("isAuthenticated()")
    public OosContainment getContainment(@PathVariable Long id) {
        service.get(id);
        return service.getContainment(id);
    }

    // ========================================================================================
    // Investigation items
    // ========================================================================================

    @PostMapping("/{id}/investigation-items")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public ResponseEntity<OosInvestigationItem> addInvestigationItem(@PathVariable Long id,
                                                                     @Valid @RequestBody AddInvestigationItemRequest request,
                                                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addInvestigationItem(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/investigation-items")
    @PreAuthorize("isAuthenticated()")
    public List<OosInvestigationItem> listInvestigationItems(@PathVariable Long id) {
        service.get(id);
        return service.listInvestigationItems(id);
    }

    @PutMapping("/{id}/investigation-items/{itemId}")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosInvestigationItem updateInvestigationItem(@PathVariable Long id, @PathVariable Long itemId,
                                                        @Valid @RequestBody UpdateInvestigationItemRequest request,
                                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return service.updateInvestigationItem(id, itemId, request, p.getId(), p.getFullName(), ip(http), ua(http));
    }

    @DeleteMapping("/{id}/investigation-items/{itemId}")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public ResponseEntity<Void> removeInvestigationItem(@PathVariable Long id, @PathVariable Long itemId,
                                                        @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.removeInvestigationItem(id, itemId, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    // ========================================================================================
    // Retest / Resample
    // ========================================================================================

    @PostMapping("/{id}/retest-resample")
    @PreAuthorize("hasAuthority('OOS_RETEST_APPROVE')")
    public ResponseEntity<OosRetestResample> addRetestResample(@PathVariable Long id,
                                                               @Valid @RequestBody AddRetestResampleRequest request,
                                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addRetestResample(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/retest-resample")
    @PreAuthorize("isAuthenticated()")
    public List<OosRetestResample> listRetestResample(@PathVariable Long id) {
        service.get(id);
        return service.listRetestResample(id);
    }

    @PutMapping("/{id}/retest-resample/{testId}")
    @PreAuthorize("hasAuthority('OOS_RETEST_APPROVE')")
    public OosCaseResponse updateRetestResample(@PathVariable Long id, @PathVariable Long testId,
                                                @Valid @RequestBody UpdateRetestResampleRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.recordRetestResult(id, testId, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    // ========================================================================================
    // Impact Assessment
    // ========================================================================================

    @PostMapping("/{id}/impact-assessment")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosCaseResponse saveImpactAssessment(@PathVariable Long id, @Valid @RequestBody SaveImpactAssessmentRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.saveImpactAssessment(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @GetMapping("/{id}/impact-assessment")
    @PreAuthorize("isAuthenticated()")
    public OosImpactAssessment getImpactAssessment(@PathVariable Long id) {
        service.get(id);
        return service.getImpactAssessment(id);
    }

    // ========================================================================================
    // Root Cause
    // ========================================================================================

    @PostMapping("/{id}/root-cause")
    @PreAuthorize("hasAuthority('OOS_INVESTIGATE')")
    public OosCaseResponse saveRootCause(@PathVariable Long id, @Valid @RequestBody SaveRootCauseRequest request,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.saveRootCause(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return detail(service.get(id));
    }

    @GetMapping("/{id}/root-cause")
    @PreAuthorize("isAuthenticated()")
    public OosRootCause getRootCause(@PathVariable Long id) {
        service.get(id);
        return service.getRootCause(id);
    }

    // ========================================================================================
    // Linked Records
    // ========================================================================================

    @PostMapping("/{id}/linked-records")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<OosLinkedRecord> addLinkedRecord(@PathVariable Long id,
                                                           @Valid @RequestBody AddLinkedRecordRequest request,
                                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addLinkedRecord(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/linked-records")
    @PreAuthorize("isAuthenticated()")
    public List<OosLinkedRecord> listLinkedRecords(@PathVariable Long id) {
        service.get(id);
        return service.listLinkedRecords(id);
    }

    @DeleteMapping("/{id}/linked-records/{recordId}")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<Void> removeLinkedRecord(@PathVariable Long id, @PathVariable Long recordId,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.removeLinkedRecord(id, recordId, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    // ========================================================================================
    // Evidence
    // ========================================================================================

    @PostMapping("/{id}/evidence")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<OosEvidence> addEvidence(@PathVariable Long id,
                                                   @Valid @RequestBody AddEvidenceRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addEvidence(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/evidence")
    @PreAuthorize("isAuthenticated()")
    public List<OosEvidence> listEvidence(@PathVariable Long id) {
        service.get(id);
        return service.listEvidence(id);
    }

    @DeleteMapping("/{id}/evidence/{evidenceId}")
    @PreAuthorize("hasAuthority('OOS_CREATE')")
    public ResponseEntity<Void> removeEvidence(@PathVariable Long id, @PathVariable Long evidenceId,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.removeEvidence(id, evidenceId, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    // ========================================================================================
    // Audit trail
    // ========================================================================================

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    // ========================================================================================
    // Internal helpers
    // ========================================================================================

    private OosCaseResponse detail(OosCase oos) {
        Long id = oos.getId();
        return OosCaseResponse.from(
                oos,
                service.getAssessment(id),
                service.getRepeatTesting(id),
                service.getInvestigation(id),
                service.getDisposition(id),
                service.getContainment(id),
                service.listInvestigationItems(id),
                service.listRetestResample(id),
                service.getImpactAssessment(id),
                service.getRootCause(id),
                service.listLinkedRecords(id),
                service.listEvidence(id),
                service.getLinkedCapaIds(id));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
