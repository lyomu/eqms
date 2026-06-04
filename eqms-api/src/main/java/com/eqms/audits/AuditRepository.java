package com.eqms.audits;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditRepository extends JpaRepository<Audit, Long> {

    Optional<Audit> findByAuditNo(String auditNo);

    Page<Audit> findByAuditStatus(AuditStatus status, Pageable pageable);

    Page<Audit> findByAuditType(AuditType type, Pageable pageable);
}
