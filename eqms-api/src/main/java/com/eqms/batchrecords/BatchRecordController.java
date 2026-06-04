package com.eqms.batchrecords;

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
import com.eqms.batchrecords.dto.AddProductProducedRequest;
import com.eqms.batchrecords.dto.BatchRecordResponse;
import com.eqms.batchrecords.dto.BatchTraceabilityResponse;
import com.eqms.batchrecords.dto.BatchTransitionRequest;
import com.eqms.batchrecords.dto.CreateBatchRecordRequest;
import com.eqms.batchrecords.dto.LinkMaterialRequest;
import com.eqms.batchrecords.dto.LinkQcTestRequest;
import com.eqms.batchrecords.dto.RecordDeviationRequest;
import com.eqms.batchrecords.dto.RecordStepRequest;
import com.eqms.batchrecords.dto.ReleaseBatchRequest;
import com.eqms.batchrecords.dto.UpdateBatchRecordRequest;
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** Electronic Batch Records REST API. All transitions and child-record operations are server-authorised. */
@RestController
@RequestMapping("/api/batch-records")
public class BatchRecordController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final BatchRecordService service;

    public BatchRecordController(BatchRecordService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<BatchRecordResponse> list(
            @RequestParam(required = false) BatchStatus status,
            @RequestParam(required = false) Long productId,
            Pageable pageable) {
        Page<BatchRecord> page = service.list(status, productId, pageable);
        return PageResponse.from(page, page.getContent().stream().map(BatchRecordResponse::summary).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<BatchRecordResponse> create(
            @Valid @RequestBody CreateBatchRecordRequest request,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        BatchRecord batch = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(batch));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public BatchRecordResponse get(@PathVariable Long id) {
        BatchRecord batch = service.get(id);
        return BatchRecordResponse.from(batch,
                service.getSteps(id).stream().map(com.eqms.batchrecords.dto.BatchProductionStepResponse::from).toList(),
                service.getQcResults(id).stream().map(BatchRecordResponse.QcResultResponse::from).toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public BatchRecordResponse update(@PathVariable Long id,
                                      @Valid @RequestBody UpdateBatchRecordRequest request,
                                      @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/record-step")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<com.eqms.batchrecords.dto.BatchProductionStepResponse> recordStep(
            @PathVariable Long id,
            @Valid @RequestBody RecordStepRequest request,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        BatchProductionStep step = service.recordStep(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(com.eqms.batchrecords.dto.BatchProductionStepResponse.from(step));
    }

    @PostMapping("/{id}/link-material")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<Void> linkMaterial(@PathVariable Long id,
                                             @Valid @RequestBody LinkMaterialRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.linkMaterial(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/link-qc-test")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<Void> linkQcTest(@PathVariable Long id,
                                           @Valid @RequestBody LinkQcTestRequest request,
                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.linkQcTest(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/record-deviation")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<Void> recordDeviation(@PathVariable Long id,
                                                @Valid @RequestBody RecordDeviationRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.recordDeviation(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/add-product")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public ResponseEntity<Void> addProduct(@PathVariable Long id,
                                           @Valid @RequestBody AddProductProducedRequest request,
                                           @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.addProductProduced(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{id}/qa-review")
    @PreAuthorize("hasAuthority('BATCH_CREATE')")
    public BatchRecordResponse submitForQaReview(@PathVariable Long id,
                                                 @Valid @RequestBody BatchTransitionRequest request,
                                                 @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.submitForQaReview(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("hasAuthority('BATCH_RELEASE')")
    public BatchRecordResponse release(@PathVariable Long id,
                                       @Valid @RequestBody ReleaseBatchRequest request,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        BatchRecordResponse response = detail(service.release(id, request.expectedVersion(), request.reason(),
                request.password(), request.totpCode(), first, request.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('BATCH_RELEASE')")
    public BatchRecordResponse reject(@PathVariable Long id,
                                      @Valid @RequestBody BatchTransitionRequest request,
                                      @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.reject(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/quarantine")
    @PreAuthorize("hasAuthority('BATCH_RELEASE')")
    public BatchRecordResponse quarantine(@PathVariable Long id,
                                          @Valid @RequestBody BatchTransitionRequest request,
                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.quarantine(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/recall")
    @PreAuthorize("hasAuthority('BATCH_RELEASE')")
    public BatchRecordResponse recall(@PathVariable Long id,
                                      @Valid @RequestBody BatchTransitionRequest request,
                                      @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.recall(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/traceability")
    @PreAuthorize("isAuthenticated()")
    public BatchTraceabilityResponse traceability(@PathVariable Long id) {
        return service.traceability(id);
    }

    @GetMapping("/{id}/deviations")
    @PreAuthorize("isAuthenticated()")
    public List<Long> deviations(@PathVariable Long id) {
        return service.getDeviations(id).stream().map(BatchDeviationLink::getDeviationId).toList();
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private BatchRecordResponse detail(BatchRecord batch) {
        return BatchRecordResponse.from(batch,
                service.getSteps(batch.getId()).stream()
                        .map(com.eqms.batchrecords.dto.BatchProductionStepResponse::from).toList(),
                service.getQcResults(batch.getId()).stream()
                        .map(BatchRecordResponse.QcResultResponse::from).toList());
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
