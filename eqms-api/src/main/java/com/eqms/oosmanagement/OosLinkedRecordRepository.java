package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OosLinkedRecordRepository extends JpaRepository<OosLinkedRecord, Long> {
    List<OosLinkedRecord> findAllByOosId(Long oosId);
}
