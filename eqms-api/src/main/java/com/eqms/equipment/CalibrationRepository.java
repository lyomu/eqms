package com.eqms.equipment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CalibrationRepository extends JpaRepository<Calibration, Long> {

    List<Calibration> findByEquipmentIdOrderByCalibrationDateDesc(Long equipmentId);

    Optional<Calibration> findFirstByEquipmentIdOrderByCalibrationDateDesc(Long equipmentId);
}
