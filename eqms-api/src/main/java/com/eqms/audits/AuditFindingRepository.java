package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditFindingRepository extends JpaRepository<AuditFinding, Long> {

    List<AuditFinding> findByAuditIdOrderByFindingNumberAsc(Long auditId);

    long countByAuditId(Long auditId);
}
