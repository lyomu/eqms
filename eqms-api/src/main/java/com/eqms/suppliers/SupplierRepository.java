package com.eqms.suppliers;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findBySupplierCode(String supplierCode);

    Page<Supplier> findBySupplierStatus(SupplierStatus status, Pageable pageable);
}
