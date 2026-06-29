package com.eqms.retention;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LegalHoldRepository extends JpaRepository<LegalHold, Long> {

    List<LegalHold> findByOrganizationIdAndRecordTypeAndRecordIdOrderByCreatedAtDesc(Long organizationId, String recordType, String recordId);
}
