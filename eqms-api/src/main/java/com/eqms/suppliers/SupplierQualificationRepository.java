package com.eqms.suppliers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierQualificationRepository extends JpaRepository<SupplierQualification, Long> {

    List<SupplierQualification> findBySupplierIdOrderByAssessmentDateDesc(Long supplierId);
}
