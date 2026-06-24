package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialQualityIssueLinkRepository extends JpaRepository<MaterialQualityIssueLink, Long> {

    List<MaterialQualityIssueLink> findByMaterialId(Long materialId);

    boolean existsByMaterialIdAndRecordTypeAndRecordId(Long materialId, MaterialQualityRecordType recordType, String recordId);
}
