package com.eqms.retention;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.retention.dto.LegalHoldRequest;
import com.eqms.retention.dto.LegalHoldResponse;
import com.eqms.retention.dto.RetentionPolicyRequest;
import com.eqms.retention.dto.RetentionPolicyResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/retention")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.view') or hasAuthority('organization.settings.update') or hasAuthority('AUDIT_VIEW')")
public class RetentionController {

    private final RetentionService service;

    public RetentionController(RetentionService service) {
        this.service = service;
    }

    @GetMapping("/policies")
    public List<RetentionPolicyResponse> policies(@AuthenticationPrincipal UserPrincipal principal) {
        return service.policies(principal.getOrganizationId()).stream().map(RetentionPolicyResponse::from).toList();
    }

    @PostMapping("/policies")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.update')")
    public RetentionPolicyResponse upsertPolicy(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody RetentionPolicyRequest request) {
        return RetentionPolicyResponse.from(service.upsertPolicy(principal.getOrganizationId(), request));
    }

    @GetMapping("/holds/{recordType}/{recordId}")
    public List<LegalHoldResponse> holds(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable String recordType,
                                         @PathVariable String recordId) {
        return service.holds(principal.getOrganizationId(), recordType, recordId).stream().map(LegalHoldResponse::from).toList();
    }

    @PostMapping("/holds")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.update') or hasAuthority('AUDIT_VIEW')")
    public LegalHoldResponse placeHold(@AuthenticationPrincipal UserPrincipal principal,
                                       @Valid @RequestBody LegalHoldRequest request) {
        return LegalHoldResponse.from(service.placeHold(principal.getOrganizationId(), request));
    }

    @PostMapping("/holds/{id}/release")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('organization.settings.update')")
    public LegalHoldResponse releaseHold(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable Long id,
                                         @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reason");
        return LegalHoldResponse.from(service.releaseHold(principal.getOrganizationId(), id, principal.getId(), reason));
    }
}
