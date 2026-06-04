package com.eqms.batchrecords;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchProductionStepRepository extends JpaRepository<BatchProductionStep, Long> {

    List<BatchProductionStep> findByBatchRecordIdOrderByStepNumberAsc(Long batchRecordId);

    long countByBatchRecordId(Long batchRecordId);
}
