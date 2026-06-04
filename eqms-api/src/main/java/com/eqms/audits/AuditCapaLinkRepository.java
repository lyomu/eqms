package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditCapaLinkRepository extends JpaRepository<AuditCapaLink, Long> {

    List<AuditCapaLink> findByAuditFindingId(Long auditFindingId);

    List<AuditCapaLink> findByAuditFindingIdIn(List<Long> auditFindingIds);
}
