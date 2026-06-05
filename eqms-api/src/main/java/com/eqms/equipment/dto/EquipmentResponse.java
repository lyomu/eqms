package com.eqms.equipment.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.eqms.equipment.Calibration;
import com.eqms.equipment.Equipment;
import com.eqms.equipment.EquipmentSpecification;
import com.eqms.equipment.MaintenanceHistory;

public record EquipmentResponse(
        Long id,
        String equipmentCode,
        String equipmentName,
        String equipmentType,
        String manufacturer,
        String model,
        String serialNumber,
        String location,
        Long ownerId,
        LocalDate acquisitionDate,
        Integer calibrationFrequencyMonths,
        LocalDate nextCalibrationDate,
        LocalDate lastCalibrationDate,
        String status,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        List<CalibrationSummary> calibrationHistory,
        List<MaintenanceSummary> maintenanceHistory,
        List<SpecificationSummary> specifications
) {
    public record CalibrationSummary(
            Long id,
            LocalDate calibrationDate,
            LocalDate calibrationDueDate,
            Long performedById,
            String performedByName,
            String calibrationCertificatePath,
            String results,
            LocalDate nextCalibrationDate,
            String notes
    ) {
        public static CalibrationSummary from(Calibration c) {
            return new CalibrationSummary(c.getId(), c.getCalibrationDate(), c.getCalibrationDueDate(),
                    c.getPerformedById(), c.getPerformedByName(), c.getCalibrationCertificatePath(),
                    c.getResults().name(), c.getNextCalibrationDate(), c.getNotes());
        }
    }

    public record MaintenanceSummary(
            Long id,
            LocalDate maintenanceDate,
            String maintenanceType,
            String workDescription,
            Long performedById,
            String performedByName,
            BigDecimal downtimeHours
    ) {
        public static MaintenanceSummary from(MaintenanceHistory m) {
            return new MaintenanceSummary(m.getId(), m.getMaintenanceDate(), m.getMaintenanceType().name(),
                    m.getWorkDescription(), m.getPerformedById(), m.getPerformedByName(), m.getDowntimeHours());
        }
    }

    public record SpecificationSummary(
            Long id,
            String specificationKey,
            String specificationValue,
            String unit,
            BigDecimal acceptanceRangeMin,
            BigDecimal acceptanceRangeMax
    ) {
        public static SpecificationSummary from(EquipmentSpecification s) {
            return new SpecificationSummary(s.getId(), s.getSpecificationKey(), s.getSpecificationValue(),
                    s.getUnit(), s.getAcceptanceRangeMin(), s.getAcceptanceRangeMax());
        }
    }

    public static EquipmentResponse from(Equipment e, List<Calibration> calibrations,
                                         List<MaintenanceHistory> maintenance,
                                         List<EquipmentSpecification> specs) {
        return new EquipmentResponse(
                e.getId(), e.getEquipmentCode(), e.getEquipmentName(), e.getEquipmentType().name(),
                e.getManufacturer(), e.getModel(), e.getSerialNumber(), e.getLocation(),
                e.getOwnerId(), e.getAcquisitionDate(), e.getCalibrationFrequencyMonths(),
                e.getNextCalibrationDate(), e.getLastCalibrationDate(),
                e.getEquipmentStatus().name(), e.getVersion(),
                e.getCreatedAt(), e.getCreatedBy(), e.getUpdatedAt(),
                calibrations == null ? List.of() : calibrations.stream().map(CalibrationSummary::from).toList(),
                maintenance == null ? List.of() : maintenance.stream().map(MaintenanceSummary::from).toList(),
                specs == null ? List.of() : specs.stream().map(SpecificationSummary::from).toList());
    }

    public static EquipmentResponse summary(Equipment e) {
        return from(e, null, null, null);
    }
}
