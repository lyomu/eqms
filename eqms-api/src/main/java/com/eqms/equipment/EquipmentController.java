package com.eqms.equipment;

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
import com.eqms.equipment.dto.AddSpecificationRequest;
import com.eqms.equipment.dto.CalibrationFailRequest;
import com.eqms.equipment.dto.CalibrationPassRequest;
import com.eqms.equipment.dto.CreateEquipmentRequest;
import com.eqms.equipment.dto.EquipmentResponse;
import com.eqms.equipment.dto.EquipmentTransitionRequest;
import com.eqms.equipment.dto.PerformCalibrationRequest;
import com.eqms.equipment.dto.RecordMaintenanceRequest;
import com.eqms.equipment.dto.ScheduleCalibrationRequest;
import com.eqms.equipment.dto.UpdateEquipmentRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService service;

    public EquipmentController(EquipmentService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<EquipmentResponse> list(@RequestParam(required = false) EquipmentStatus status,
                                                @RequestParam(required = false) EquipmentType type,
                                                @RequestParam(required = false) String location,
                                                Pageable pageable) {
        Page<Equipment> page = service.list(status, type, location, pageable);
        return PageResponse.from(page, page.getContent().stream().map(EquipmentResponse::summary).toList());
    }

    @GetMapping("/due-for-calibration")
    @PreAuthorize("isAuthenticated()")
    public List<EquipmentResponse> dueForCalibration() {
        return service.dueForCalibration().stream().map(EquipmentResponse::summary).toList();
    }

    @GetMapping("/out-of-calibration")
    @PreAuthorize("isAuthenticated()")
    public List<EquipmentResponse> outOfCalibration() {
        return service.outOfCalibration().stream().map(EquipmentResponse::summary).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('EQUIPMENT_CREATE')")
    public ResponseEntity<EquipmentResponse> create(@Valid @RequestBody CreateEquipmentRequest request,
                                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        Equipment e = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(detail(e));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public EquipmentResponse get(@PathVariable Long id) {
        Equipment e = service.get(id);
        return detail(e);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('EQUIPMENT_CREATE')")
    public EquipmentResponse update(@PathVariable Long id, @Valid @RequestBody UpdateEquipmentRequest request,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.update(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/schedule-calibration")
    @PreAuthorize("hasAuthority('EQUIPMENT_CREATE')")
    public EquipmentResponse scheduleCalibration(@PathVariable Long id, @Valid @RequestBody ScheduleCalibrationRequest request,
                                                 @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.scheduleCalibration(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/perform-calibration")
    @PreAuthorize("hasAuthority('EQUIPMENT_APPROVE')")
    public EquipmentResponse performCalibration(@PathVariable Long id, @Valid @RequestBody PerformCalibrationRequest request,
                                                @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.performCalibration(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/calibration-pass")
    @PreAuthorize("hasAuthority('EQUIPMENT_APPROVE')")
    public EquipmentResponse calibrationPass(@PathVariable Long id, @Valid @RequestBody CalibrationPassRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.calibrationPass(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/calibration-fail")
    @PreAuthorize("hasAuthority('EQUIPMENT_APPROVE')")
    public EquipmentResponse calibrationFail(@PathVariable Long id, @Valid @RequestBody CalibrationFailRequest request,
                                             @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.calibrationFail(id, request, p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/calibration-history")
    @PreAuthorize("isAuthenticated()")
    public List<EquipmentResponse.CalibrationSummary> calibrationHistory(@PathVariable Long id) {
        return service.calibrationHistory(id).stream().map(EquipmentResponse.CalibrationSummary::from).toList();
    }

    @PostMapping("/{id}/maintenance")
    @PreAuthorize("hasAuthority('EQUIPMENT_CREATE')")
    public ResponseEntity<EquipmentResponse.MaintenanceSummary> recordMaintenance(
            @PathVariable Long id, @Valid @RequestBody RecordMaintenanceRequest request,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        MaintenanceHistory record = service.recordMaintenance(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(EquipmentResponse.MaintenanceSummary.from(record));
    }

    @PostMapping("/{id}/specifications")
    @PreAuthorize("hasAuthority('EQUIPMENT_CREATE')")
    public ResponseEntity<EquipmentResponse.SpecificationSummary> addSpecification(
            @PathVariable Long id, @Valid @RequestBody AddSpecificationRequest request,
            @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        EquipmentSpecification spec = service.addSpecification(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(EquipmentResponse.SpecificationSummary.from(spec));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("hasAuthority('EQUIPMENT_APPROVE')")
    public EquipmentResponse retire(@PathVariable Long id, @Valid @RequestBody EquipmentTransitionRequest request,
                                    @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return detail(service.retire(id, request.expectedVersion(), request.reason(),
                p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private EquipmentResponse detail(Equipment e) {
        return EquipmentResponse.from(e,
                service.getCalibrations(e.getId()),
                service.getMaintenance(e.getId()),
                service.getSpecifications(e.getId()));
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
