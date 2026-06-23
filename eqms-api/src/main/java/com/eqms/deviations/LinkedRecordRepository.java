package com.eqms.deviations;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LinkedRecordRepository extends JpaRepository<DeviationLinkedRecord, Long> {

    List<DeviationLinkedRecord> findByDeviationId(Long deviationId);

    boolean existsByDeviationIdAndLinkedRecordTypeAndLinkedRecordId(Long deviationId, String linkedRecordType, Long linkedRecordId);
}
