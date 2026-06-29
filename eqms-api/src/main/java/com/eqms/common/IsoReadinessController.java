package com.eqms.common;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.common.dto.IsoReadinessResponse;

@RestController
@RequestMapping("/api/iso-readiness")
public class IsoReadinessController {

    private final IsoReadinessService service;

    public IsoReadinessController(IsoReadinessService service) {
        this.service = service;
    }

    @GetMapping("/{recordType}/{recordId}")
    @PreAuthorize("isAuthenticated()")
    public IsoReadinessResponse readiness(@PathVariable String recordType, @PathVariable String recordId) {
        return service.readiness(recordType, recordId);
    }
}
