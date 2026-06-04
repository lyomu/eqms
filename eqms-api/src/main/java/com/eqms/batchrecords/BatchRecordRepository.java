package com.eqms.batchrecords;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchRecordRepository extends JpaRepository<BatchRecord, Long> {

    Optional<BatchRecord> findByBatchNo(String batchNo);

    Page<BatchRecord> findByBatchStatus(BatchStatus status, Pageable pageable);

    Page<BatchRecord> findByProductId(Long productId, Pageable pageable);

    Page<BatchRecord> findByBatchStatusAndProductId(BatchStatus status, Long productId, Pageable pageable);
}
