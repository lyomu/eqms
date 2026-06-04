package com.eqms.batchrecords;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchDeviationLinkRepository extends JpaRepository<BatchDeviationLink, Long> {

    List<BatchDeviationLink> findByBatchRecordId(Long batchRecordId);

    boolean existsByBatchRecordIdAndDeviationId(Long batchRecordId, Long deviationId);
}
