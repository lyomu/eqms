package com.eqms.retention;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RetentionPolicyRepository extends JpaRepository<RetentionPolicy, Long> {

    List<RetentionPolicy> findByOrganizationIdOrderByRecordTypeAsc(Long organizationId);

    Optional<RetentionPolicy> findByOrganizationIdAndRecordType(Long organizationId, String recordType);
}
