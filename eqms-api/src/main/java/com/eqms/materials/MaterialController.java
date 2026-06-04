package com.eqms.materials;

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
import com.eqms.materials.dto.ApproveMaterialRequest;
import com.eqms.materials.dto.CreateMaterialRequest;
import com.eqms.materials.dto.MaterialResponse;
import com.eqms.materials.dto.MaterialTransitionRequest;
import com.eqms.materials.dto.UpdateMaterialRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/** Material Management REST API. Backend-guarded; transitions/signatures re-enforced in the service. */
@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final MaterialService service;

    public MaterialController(MaterialService service) {
        this.service = service;
    }

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

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
