package com.eqms.suppliers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierCertificationRepository extends JpaRepository<SupplierCertification, Long> {

    List<SupplierCertification> findBySupplierIdOrderByExpiryDateAsc(Long supplierId);
}
