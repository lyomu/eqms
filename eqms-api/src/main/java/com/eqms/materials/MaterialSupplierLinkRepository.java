package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialSupplierLinkRepository extends JpaRepository<MaterialSupplierLink, Long> {

    List<MaterialSupplierLink> findByMaterialId(Long materialId);
}
