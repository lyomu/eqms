package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialInventoryLedgerRepository extends JpaRepository<MaterialInventoryLedger, Long> {

    List<MaterialInventoryLedger> findByMaterialIdOrderByTransactionAtDesc(Long materialId);

    List<MaterialInventoryLedger> findByMaterialLotIdOrderByTransactionAtAsc(Long lotId);
}
