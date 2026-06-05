package com.eqms.equipment;

import java.time.LocalDate;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.WorkflowAware;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@SQLDelete(sql = "UPDATE equipment SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Equipment extends RegulatedEntity implements WorkflowAware {

    @Column(name = "equipment_code", nullable = false, length = 40, unique = true)
    private String equipmentCode;

    @Column(name = "equipment_name", nullable = false, length = 200)
    private String equipmentName;

    @Enumerated(EnumType.STRING)
    @Column(name = "equipment_type", nullable = false, length = 40)
    private EquipmentType equipmentType;

    @Column(name = "manufacturer", length = 200)
    private String manufacturer;

    @Column(name = "model", length = 200)
    private String model;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    @Column(name = "calibration_frequency_months")
    private Integer calibrationFrequencyMonths;

    @Column(name = "next_calibration_date")
    private LocalDate nextCalibrationDate;

    @Column(name = "last_calibration_date")
    private LocalDate lastCalibrationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private EquipmentStatus equipmentStatus = EquipmentStatus.REGISTERED;

    // --- WorkflowAware -----------------------------------------------------------------------

    @Override
    @Transient
    public String getRecordType() {
        return "Equipment";
    }

    @Override
    @Transient
    public String getStatus() {
        return equipmentStatus.name();
    }

    @Override
    public void setStatus(String status) {
        this.equipmentStatus = EquipmentStatus.valueOf(status);
    }

    @Override
    @Transient
    public String workflowContentHash() {
        return SignatureService.sha256Hex(
                (equipmentCode == null ? "" : equipmentCode) + "|"
                        + (equipmentName == null ? "" : equipmentName) + "|"
                        + (serialNumber == null ? "" : serialNumber));
    }
}
