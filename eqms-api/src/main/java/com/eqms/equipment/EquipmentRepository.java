package com.eqms.equipment;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    Optional<Equipment> findByEquipmentCode(String equipmentCode);

    Page<Equipment> findByEquipmentStatus(EquipmentStatus status, Pageable pageable);

    Page<Equipment> findByEquipmentType(EquipmentType type, Pageable pageable);

    Page<Equipment> findByLocationContainingIgnoreCase(String location, Pageable pageable);

    List<Equipment> findAllByEquipmentStatus(EquipmentStatus status);

    @Query("SELECT e FROM Equipment e WHERE e.nextCalibrationDate IS NOT NULL " +
           "AND e.nextCalibrationDate <= :cutoff " +
           "AND e.equipmentStatus NOT IN :excluded " +
           "ORDER BY e.nextCalibrationDate ASC")
    List<Equipment> findDueForCalibration(@Param("cutoff") LocalDate cutoff,
                                          @Param("excluded") List<EquipmentStatus> excluded);
}
