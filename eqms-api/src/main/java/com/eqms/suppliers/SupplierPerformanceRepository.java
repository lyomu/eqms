package com.eqms.suppliers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierPerformanceRepository extends JpaRepository<SupplierPerformance, Long> {

    List<SupplierPerformance> findBySupplierIdOrderByAssessmentPeriodEndDesc(Long supplierId);
}
