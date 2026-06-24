package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLinkedRecordRepository extends JpaRepository<AuditLinkedRecord, Long> {

    List<AuditLinkedRecord> findByAuditId(Long auditId);

    boolean existsByAuditIdAndRecordTypeAndRecordId(Long auditId, AuditLinkedRecordType recordType, String recordId);
}
