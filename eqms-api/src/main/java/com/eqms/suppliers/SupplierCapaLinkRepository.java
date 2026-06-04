package com.eqms.suppliers;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierCapaLinkRepository extends JpaRepository<SupplierCapaLink, Long> {

    List<SupplierCapaLink> findBySupplierFindingId(Long supplierFindingId);
}
