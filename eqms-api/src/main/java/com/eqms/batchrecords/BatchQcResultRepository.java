package com.eqms.batchrecords;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchQcResultRepository extends JpaRepository<BatchQcResult, Long> {

    List<BatchQcResult> findByBatchRecordId(Long batchRecordId);

    long countByBatchRecordId(Long batchRecordId);
}
