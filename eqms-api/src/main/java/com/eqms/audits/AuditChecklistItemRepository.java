package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditChecklistItemRepository extends JpaRepository<AuditChecklistItem, Long> {

    List<AuditChecklistItem> findByAuditIdOrderBySortOrderAsc(Long auditId);
}
