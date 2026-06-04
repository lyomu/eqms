package com.eqms.batchrecords;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchProductProducedRepository extends JpaRepository<BatchProductProduced, Long> {

    List<BatchProductProduced> findByBatchRecordId(Long batchRecordId);
}
