package com.eqms.batchrecords;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchMaterialUsedRepository extends JpaRepository<BatchMaterialUsed, Long> {

    List<BatchMaterialUsed> findByBatchRecordId(Long batchRecordId);
}
