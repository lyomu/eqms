package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialLotRepository extends JpaRepository<MaterialLot, Long> {

    List<MaterialLot> findByMaterialIdOrderByCreatedAtDesc(Long materialId);

    List<MaterialLot> findByMaterialIdAndLotStatus(Long materialId, LotStatus status);
}
