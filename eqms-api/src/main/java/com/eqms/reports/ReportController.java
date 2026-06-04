package com.eqms.reports;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.documents.DocumentStatus;
import com.eqms.reports.dto.ExportResult;
import com.eqms.reports.dto.ReportData;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reporting REST API. The per-report GET endpoints return on-screen data; {@code /export} renders a
 * downloadable CSV/XLSX and records an audited EXPORT action (CLAUDE.md M10). Viewing requires
 * AUDIT_VIEW (the same authority used to read regulated record data across the system).
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/documents")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public ReportData documents(@RequestParam(required = false) DocumentStatus status) {
        return service.documentsReport(status);
    }

    @GetMapping("/changes")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public ReportData changes() {
        return service.changesReport();
    }

    @GetMapping("/deviations")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public ReportData deviations() {
        return service.deviationsReport();
    }

    @GetMapping("/capa")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public ReportData capa() {
        return service.capaReport();
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<ByteArrayResource> export(@RequestParam ReportType type,
                                                    @RequestParam(defaultValue = "CSV") ReportFormat format,
                                                    @AuthenticationPrincipal UserPrincipal principal,
                                                    HttpServletRequest http) {
        ExportResult result = service.export(type, format, principal.getId(), principal.getFullName(),
                clientIp(http), userAgent(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
                .contentType(MediaType.parseMediaType(result.contentType()))
                .contentLength(result.content().length)
                .body(new ByteArrayResource(result.content()));
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
