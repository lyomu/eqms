package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditFollowUpRepository extends JpaRepository<AuditFollowUp, Long> {

    List<AuditFollowUp> findByCurrentAuditId(Long currentAuditId);
}
