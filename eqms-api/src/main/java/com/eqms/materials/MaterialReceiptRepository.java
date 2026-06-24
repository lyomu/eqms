package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialReceiptRepository extends JpaRepository<MaterialReceipt, Long> {

    List<MaterialReceipt> findByMaterialIdOrderByCreatedAtDesc(Long materialId);
}
