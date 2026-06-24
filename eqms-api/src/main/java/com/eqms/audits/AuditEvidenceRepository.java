package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditEvidenceRepository extends JpaRepository<AuditEvidence, Long> {

    List<AuditEvidence> findByAuditIdOrderByCreatedAtAsc(Long auditId);
}
