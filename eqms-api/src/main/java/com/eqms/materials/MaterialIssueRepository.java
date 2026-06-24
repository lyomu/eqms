package com.eqms.materials;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialIssueRepository extends JpaRepository<MaterialIssue, Long> {

    List<MaterialIssue> findByMaterialLotIdOrderByCreatedAtDesc(Long lotId);

    List<MaterialIssue> findByMaterialIdOrderByCreatedAtDesc(Long materialId);
}
