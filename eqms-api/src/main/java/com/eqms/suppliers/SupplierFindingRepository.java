package com.eqms.suppliers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierFindingRepository extends JpaRepository<SupplierFinding, Long> {

    List<SupplierFinding> findBySupplierIdOrderByFindingDateDesc(Long supplierId);
}
