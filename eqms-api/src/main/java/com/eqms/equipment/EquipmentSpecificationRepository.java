package com.eqms.equipment;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipmentSpecificationRepository extends JpaRepository<EquipmentSpecification, Long> {

    List<EquipmentSpecification> findByEquipmentIdOrderBySpecificationKeyAsc(Long equipmentId);
}
