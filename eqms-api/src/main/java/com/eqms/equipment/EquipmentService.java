package com.eqms.equipment;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.admin.settings.OrganizationSettingsPolicyService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.deviations.DeviationSeverity;
import com.eqms.deviations.DeviationService;
import com.eqms.deviations.dto.CreateDeviationRequest;
import com.eqms.equipment.dto.AddSpecificationRequest;
import com.eqms.equipment.dto.CalibrationFailRequest;
import com.eqms.equipment.dto.CalibrationPassRequest;
import com.eqms.equipment.dto.CreateEquipmentRequest;
import com.eqms.equipment.dto.PerformCalibrationRequest;
import com.eqms.equipment.dto.RecordMaintenanceRequest;
import com.eqms.equipment.dto.ScheduleCalibrationRequest;
import com.eqms.equipment.dto.UpdateEquipmentRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

@Service
public class EquipmentService {

    private static final String EQUIPMENT_PREFIX = "EQUIP";
    private static final int DUE_FOR_CALIBRATION_DAYS = 30;

    private final EquipmentRepository equipmentRepository;
    private final CalibrationRepository calibrationRepository;
    private final MaintenanceHistoryRepository maintenanceRepository;
    private final EquipmentSpecificationRepository specificationRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final DeviationService deviationService;
    private final AuditService auditService;
    private final OrganizationSettingsPolicyService settingsPolicy;
    private final Clock clock;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            CalibrationRepository calibrationRepository,
                            MaintenanceHistoryRepository maintenanceRepository,
                            EquipmentSpecificationRepository specificationRepository,
                            SequenceService sequenceService,
                            WorkflowService workflowService,
                            DeviationService deviationService,
                            AuditService auditService,
                            OrganizationSettingsPolicyService settingsPolicy,
                            Clock utcClock) {
        this.equipmentRepository = equipmentRepository;
        this.calibrationRepository = calibrationRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.specificationRepository = specificationRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.deviationService = deviationService;
        this.auditService = auditService;
        this.settingsPolicy = settingsPolicy;
        this.clock = utcClock;
    }

    @Transactional
    public Equipment create(CreateEquipmentRequest request, Long actorId, String actorName, String ip, String ua) {
        if (settingsPolicy.enabled("equipment", "calibrationRequired", true)
                && request.calibrationFrequencyMonths() == null) {
            throw new WorkflowException("Calibration frequency is required by organization equipment settings");
        }
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(EQUIPMENT_PREFIX, year);

        Equipment equipment = new Equipment();
        equipment.setEquipmentCode(code);
        equipment.setEquipmentName(request.equipmentName());
        equipment.setEquipmentType(request.equipmentType());
        equipment.setManufacturer(request.manufacturer());
        equipment.setModel(request.model());
        equipment.setSerialNumber(request.serialNumber());
        equipment.setLocation(request.location());
        equipment.setOwnerId(actorId);
        equipment.setAcquisitionDate(request.acquisitionDate());
        equipment.setCalibrationFrequencyMonths(request.calibrationFrequencyMonths());
        equipment.setEquipmentStatus(EquipmentStatus.REGISTERED);
        equipment = equipmentRepository.save(equipment);

        audit(equipment.getId(), AuditAction.CREATE, null, null, code,
                "Equipment registered", actorId, actorName, ip, ua);
        return equipment;
    }

    @Transactional(readOnly = true)
    public Page<Equipment> list(EquipmentStatus status, EquipmentType type, String location, Pageable pageable) {
        if (status != null) return equipmentRepository.findByEquipmentStatus(status, pageable);
        if (type != null) return equipmentRepository.findByEquipmentType(type, pageable);
        if (location != null && !location.isBlank()) {
            return equipmentRepository.findByLocationContainingIgnoreCase(location, pageable);
        }
        return equipmentRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Equipment get(Long id) {
        return require(id);
    }

    @Transactional
    public Equipment update(Long id, UpdateEquipmentRequest request, Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        checkVersion(equipment.getVersion(), request.expectedVersion());
        if (equipment.getEquipmentStatus() == EquipmentStatus.RETIRED) {
            throw new WorkflowException("Retired equipment cannot be updated");
        }
        if (request.equipmentName() != null) equipment.setEquipmentName(request.equipmentName());
        if (request.location() != null) equipment.setLocation(request.location());
        if (request.ownerId() != null) equipment.setOwnerId(request.ownerId());
        if (request.calibrationFrequencyMonths() != null) {
            equipment.setCalibrationFrequencyMonths(request.calibrationFrequencyMonths());
        }
        audit(equipment.getId(), AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Equipment details updated", actorId, actorName, ip, ua);
        return equipment;
    }

    @Transactional
    public Equipment scheduleCalibration(Long id, ScheduleCalibrationRequest request,
                                         Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        checkVersion(equipment.getVersion(), request.expectedVersion());
        if (equipment.getEquipmentStatus() == EquipmentStatus.RETIRED) {
            throw new WorkflowException("Retired equipment cannot be scheduled for calibration");
        }
        String oldDate = equipment.getNextCalibrationDate() == null ? null : equipment.getNextCalibrationDate().toString();
        equipment.setNextCalibrationDate(request.nextCalibrationDate());
        audit(id, AuditAction.UPDATE, "next_calibration_date", oldDate, request.nextCalibrationDate().toString(),
                request.reason() != null ? request.reason() : "Calibration scheduled", actorId, actorName, ip, ua);
        return equipment;
    }

    @Transactional
    public Equipment performCalibration(Long id, PerformCalibrationRequest request,
                                        Long actorId, String actorName, String ip, String ua) {
        if (request.result() == CalibrationResult.PASS) {
            CalibrationPassRequest pass = new CalibrationPassRequest(
                    request.expectedVersion(), request.calibrationDate(), request.performedByName(),
                    request.calibrationDueDate(), request.calibrationCertificatePath(),
                    request.notes(), request.reason());
            return calibrationPass(id, pass, actorId, actorName, ip, ua);
        } else {
            CalibrationFailRequest fail = new CalibrationFailRequest(
                    request.expectedVersion(), request.calibrationDate(), request.performedByName(),
                    request.calibrationDueDate(), request.calibrationCertificatePath(),
                    request.notes() != null ? request.notes() : "Calibration failed", request.reason());
            return calibrationFail(id, fail, actorId, actorName, ip, ua);
        }
    }

    @Transactional
    public Equipment calibrationPass(Long id, CalibrationPassRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        if (equipment.getEquipmentStatus() == EquipmentStatus.RETIRED) {
            throw new WorkflowException("Retired equipment cannot be calibrated");
        }

        LocalDate nextDue = null;
        if (equipment.getCalibrationFrequencyMonths() != null) {
            nextDue = request.calibrationDate().plusMonths(equipment.getCalibrationFrequencyMonths());
        }

        Calibration calibration = new Calibration();
        calibration.setEquipmentId(id);
        calibration.setCalibrationDate(request.calibrationDate());
        calibration.setCalibrationDueDate(request.calibrationDueDate());
        calibration.setPerformedById(actorId);
        calibration.setPerformedByName(request.performedByName() != null ? request.performedByName() : actorName);
        calibration.setCalibrationCertificatePath(request.calibrationCertificatePath());
        calibration.setResults(CalibrationResult.PASS);
        calibration.setNextCalibrationDate(nextDue);
        calibration.setNotes(request.notes());
        calibrationRepository.save(calibration);

        equipment.setLastCalibrationDate(request.calibrationDate());
        equipment.setNextCalibrationDate(nextDue);

        transition(equipment, EquipmentWorkflow.CALIBRATION_PASS, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Calibration passed", actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "calibration_result", null, "PASS",
                "Calibration record: PASS", actorId, actorName, ip, ua);
        return equipment;
    }

    @Transactional
    public Equipment calibrationFail(Long id, CalibrationFailRequest request,
                                     Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        if (equipment.getEquipmentStatus() == EquipmentStatus.RETIRED) {
            throw new WorkflowException("Retired equipment cannot be calibrated");
        }

        Calibration calibration = new Calibration();
        calibration.setEquipmentId(id);
        calibration.setCalibrationDate(request.calibrationDate());
        calibration.setCalibrationDueDate(request.calibrationDueDate());
        calibration.setPerformedById(actorId);
        calibration.setPerformedByName(request.performedByName() != null ? request.performedByName() : actorName);
        calibration.setCalibrationCertificatePath(request.calibrationCertificatePath());
        calibration.setResults(CalibrationResult.FAIL);
        calibration.setNotes(request.notes());
        calibrationRepository.save(calibration);

        equipment.setLastCalibrationDate(request.calibrationDate());

        transition(equipment, EquipmentWorkflow.CALIBRATION_FAIL, request.expectedVersion(),
                request.reason() != null ? request.reason() : "Calibration failed — equipment marked out of calibration",
                actorId, actorName, ip, ua);
        audit(id, AuditAction.UPDATE, "calibration_result", null, "FAIL",
                "Calibration record: FAIL — investigation required", actorId, actorName, ip, ua);

        // Regulatory requirement: calibration failure must be investigated via a formal Deviation (M16 spec).
        deviationService.create(
                new CreateDeviationRequest(
                        "Calibration failure: " + equipment.getEquipmentName() + " (" + equipment.getEquipmentCode() + ")",
                        DeviationSeverity.MAJOR,
                        "Equipment " + equipment.getEquipmentCode() + " failed calibration on "
                                + request.calibrationDate() + ". "
                                + (request.notes() != null ? request.notes() : "No additional notes."),
                        "Equipment quarantined and marked Out of Calibration. Investigation required before return to service.",
                        request.calibrationDate().atStartOfDay(java.time.ZoneOffset.UTC).toInstant(),
                        null, null, null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null, null, null, null, null),
                actorId, actorName, ip, ua);

        return equipment;
    }

    @Transactional
    public Equipment retire(Long id, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        transition(equipment, EquipmentWorkflow.RETIRE, expectedVersion,
                reason != null ? reason : "Equipment retired", actorId, actorName, ip, ua);
        return equipment;
    }

    @Transactional
    public MaintenanceHistory recordMaintenance(Long id, RecordMaintenanceRequest request,
                                                Long actorId, String actorName, String ip, String ua) {
        Equipment equipment = require(id);
        if (equipment.getEquipmentStatus() == EquipmentStatus.RETIRED) {
            throw new WorkflowException("Retired equipment cannot have maintenance recorded");
        }

        MaintenanceHistory record = new MaintenanceHistory();
        record.setEquipmentId(id);
        record.setMaintenanceDate(request.maintenanceDate());
        record.setMaintenanceType(request.maintenanceType());
        record.setWorkDescription(request.workDescription());
        record.setPerformedById(actorId);
        record.setPerformedByName(request.performedByName() != null ? request.performedByName() : actorName);
        record.setDowntimeHours(request.downtimeHours());
        record = maintenanceRepository.save(record);

        audit(id, AuditAction.UPDATE, "maintenance", null, request.maintenanceType().name(),
                "Maintenance recorded: " + request.maintenanceType().name(), actorId, actorName, ip, ua);
        return record;
    }

    @Transactional
    public EquipmentSpecification addSpecification(Long id, AddSpecificationRequest request,
                                                   Long actorId, String actorName, String ip, String ua) {
        require(id);
        EquipmentSpecification spec = new EquipmentSpecification();
        spec.setEquipmentId(id);
        spec.setSpecificationKey(request.specificationKey());
        spec.setSpecificationValue(request.specificationValue());
        spec.setUnit(request.unit());
        spec.setAcceptanceRangeMin(request.acceptanceRangeMin());
        spec.setAcceptanceRangeMax(request.acceptanceRangeMax());
        spec = specificationRepository.save(spec);
        audit(id, AuditAction.UPDATE, "specification", null, request.specificationKey(),
                "Specification added", actorId, actorName, ip, ua);
        return spec;
    }

    @Transactional(readOnly = true)
    public List<Calibration> calibrationHistory(Long id) {
        require(id);
        return calibrationRepository.findByEquipmentIdOrderByCalibrationDateDesc(id);
    }

    @Transactional(readOnly = true)
    public List<Equipment> dueForCalibration() {
        LocalDate cutoff = LocalDate.now(clock).plusDays(DUE_FOR_CALIBRATION_DAYS);
        return equipmentRepository.findDueForCalibration(cutoff,
                List.of(EquipmentStatus.RETIRED, EquipmentStatus.OUT_OF_CALIBRATION));
    }

    @Transactional(readOnly = true)
    public List<Equipment> outOfCalibration() {
        return equipmentRepository.findAllByEquipmentStatus(EquipmentStatus.OUT_OF_CALIBRATION);
    }

    @Transactional(readOnly = true)
    public List<Calibration> getCalibrations(Long equipmentId) {
        return calibrationRepository.findByEquipmentIdOrderByCalibrationDateDesc(equipmentId);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceHistory> getMaintenance(Long equipmentId) {
        return maintenanceRepository.findByEquipmentIdOrderByMaintenanceDateDesc(equipmentId);
    }

    @Transactional(readOnly = true)
    public List<EquipmentSpecification> getSpecifications(Long equipmentId) {
        return specificationRepository.findByEquipmentIdOrderBySpecificationKeyAsc(equipmentId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(EquipmentWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals -------------------------------------------------------------------------

    private void transition(Equipment equipment, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(EquipmentWorkflow.DEFINITION, equipment,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(ua)
                        .build());
    }

    private void audit(Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(EquipmentWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private Equipment require(Long id) {
        return equipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));
    }
}
