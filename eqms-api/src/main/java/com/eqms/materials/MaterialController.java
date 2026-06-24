package com.eqms.materials;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import com.eqms.materials.dto.ApproveMaterialRequest;
import com.eqms.materials.dto.CreateMaterialRequest;
import com.eqms.materials.dto.CreateQualityIssueLinkRequest;
import com.eqms.materials.dto.CreateSupplierLinkRequest;
import com.eqms.materials.dto.DisposeLotRequest;
import com.eqms.materials.dto.HoldLotRequest;
import com.eqms.materials.dto.IssueMaterialRequest;
import com.eqms.materials.dto.MaterialInventoryLedgerResponse;
import com.eqms.materials.dto.MaterialIssueResponse;
import com.eqms.materials.dto.MaterialLotResponse;
import com.eqms.materials.dto.MaterialQualityIssueLinkResponse;
import com.eqms.materials.dto.MaterialReceiptResponse;
import com.eqms.materials.dto.MaterialResponse;
import com.eqms.materials.dto.MaterialSupplierLinkResponse;
import com.eqms.materials.dto.MaterialTransitionRequest;
import com.eqms.materials.dto.ReceiveMaterialRequest;
import com.eqms.materials.dto.RejectLotRequest;
import com.eqms.materials.dto.ReleaseLotRequest;
import com.eqms.materials.dto.UpdateMaterialRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final MaterialService service;

    public MaterialController(MaterialService service) {
        this.service = service;
    }

    // ─── Material master ──────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<MaterialResponse> list(@RequestParam(required = false) MaterialStatus status, Pageable pageable) {
        Page<Material> page = service.list(status, pageable);
        return PageResponse.from(page, page.getContent().stream().map(MaterialResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<MaterialResponse> create(@Valid @RequestBody CreateMaterialRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Material material = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(MaterialResponse.from(material));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public MaterialResponse get(@PathVariable Long id) {
        return MaterialResponse.from(service.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public MaterialResponse update(@PathVariable Long id, @Valid @RequestBody UpdateMaterialRequest request,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    // ─── Workflow transitions ─────────────────────────────────────────────────

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public MaterialResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody MaterialTransitionRequest r,
                                              @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.submitForApproval(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveMaterialRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean first = session.getAttribute(SIGNED_IN_SESSION) == null;
        MaterialResponse response = MaterialResponse.from(service.approve(id, r.expectedVersion(), r.reason(),
                r.password(), r.totpCode(), first, r.meaningStatement(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE);
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialResponse reject(@PathVariable Long id, @Valid @RequestBody MaterialTransitionRequest r,
                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.reject(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/put-on-hold")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialResponse putOnHold(@PathVariable Long id, @Valid @RequestBody MaterialTransitionRequest r,
                                      @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.putOnHold(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialResponse release(@PathVariable Long id, @Valid @RequestBody MaterialTransitionRequest r,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.release(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/obsolete")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialResponse obsolete(@PathVariable Long id, @Valid @RequestBody MaterialTransitionRequest r,
                                     @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialResponse.from(service.obsolete(id, r.expectedVersion(), r.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    // ─── Supplier links ───────────────────────────────────────────────────────

    @GetMapping("/{id}/suppliers")
    @PreAuthorize("isAuthenticated()")
    public List<MaterialSupplierLinkResponse> getSuppliers(@PathVariable Long id) {
        return service.getSupplierLinks(id).stream().map(MaterialSupplierLinkResponse::from).toList();
    }

    @PostMapping("/{id}/suppliers")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<MaterialSupplierLinkResponse> addSupplier(
            @PathVariable Long id,
            @Valid @RequestBody CreateSupplierLinkRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        MaterialSupplierLink link = service.addSupplierLink(id, req, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(MaterialSupplierLinkResponse.from(link));
    }

    @DeleteMapping("/{id}/suppliers/{linkId}")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<Void> removeSupplier(@PathVariable Long id, @PathVariable Long linkId,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.removeSupplierLink(id, linkId, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    // ─── Lots ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/lots")
    @PreAuthorize("isAuthenticated()")
    public List<MaterialLotResponse> getLots(@PathVariable Long id) {
        return service.getLots(id).stream().map(MaterialLotResponse::from).toList();
    }

    @PostMapping("/{id}/receipts")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<MaterialLotResponse> receiveMaterial(
            @PathVariable Long id,
            @Valid @RequestBody ReceiveMaterialRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        MaterialLot lot = service.receiveMaterial(id, req, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(MaterialLotResponse.from(lot));
    }

    @GetMapping("/{id}/receipts")
    @PreAuthorize("isAuthenticated()")
    public List<MaterialReceiptResponse> getReceipts(@PathVariable Long id) {
        return service.getReceipts(id).stream().map(MaterialReceiptResponse::from).toList();
    }

    // ─── Lot disposition ──────────────────────────────────────────────────────

    @PostMapping("/{id}/lots/{lotId}/release")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialLotResponse releaseLot(@PathVariable Long id, @PathVariable Long lotId,
                                          @Valid @RequestBody ReleaseLotRequest req,
                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialLotResponse.from(service.releaseLot(id, lotId, req, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/lots/{lotId}/reject")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialLotResponse rejectLot(@PathVariable Long id, @PathVariable Long lotId,
                                         @Valid @RequestBody RejectLotRequest req,
                                         @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialLotResponse.from(service.rejectLot(id, lotId, req, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/lots/{lotId}/hold")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialLotResponse holdLot(@PathVariable Long id, @PathVariable Long lotId,
                                       @Valid @RequestBody HoldLotRequest req,
                                       @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialLotResponse.from(service.holdLot(id, lotId, req, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/lots/{lotId}/dispose")
    @PreAuthorize("hasAuthority('MATERIAL_APPROVE')")
    public MaterialLotResponse disposeLot(@PathVariable Long id, @PathVariable Long lotId,
                                          @Valid @RequestBody DisposeLotRequest req,
                                          @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return MaterialLotResponse.from(service.disposeLot(id, lotId, req, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/lots/{lotId}/issue")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<MaterialIssueResponse> issueMaterial(@PathVariable Long id, @PathVariable Long lotId,
                                                               @Valid @RequestBody IssueMaterialRequest req,
                                                               @AuthenticationPrincipal UserPrincipal p,
                                                               HttpServletRequest http) {
        MaterialIssue issue = service.issueMaterial(id, lotId, req, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(MaterialIssueResponse.from(issue));
    }

    // ─── Ledger ───────────────────────────────────────────────────────────────

    @GetMapping("/{id}/ledger")
    @PreAuthorize("isAuthenticated()")
    public List<MaterialInventoryLedgerResponse> getMaterialLedger(@PathVariable Long id) {
        return service.getMaterialLedger(id).stream().map(MaterialInventoryLedgerResponse::from).toList();
    }

    // ─── Quality issues ───────────────────────────────────────────────────────

    @GetMapping("/{id}/quality-issues")
    @PreAuthorize("isAuthenticated()")
    public List<MaterialQualityIssueLinkResponse> getQualityIssues(@PathVariable Long id) {
        return service.getQualityIssueLinks(id).stream().map(MaterialQualityIssueLinkResponse::from).toList();
    }

    @PostMapping("/{id}/quality-issues")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<MaterialQualityIssueLinkResponse> addQualityIssue(
            @PathVariable Long id,
            @Valid @RequestBody CreateQualityIssueLinkRequest req,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        MaterialQualityIssueLink link = service.addQualityIssueLink(id, req, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(MaterialQualityIssueLinkResponse.from(link));
    }

    @DeleteMapping("/{id}/quality-issues/{linkId}")
    @PreAuthorize("hasAuthority('MATERIAL_CREATE')")
    public ResponseEntity<Void> removeQualityIssue(@PathVariable Long id, @PathVariable Long linkId,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        service.removeQualityIssueLink(id, linkId, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
