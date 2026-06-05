package com.eqms.nonconformance;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NonConformanceUseAsIsApprovalRepository extends JpaRepository<NonConformanceUseAsIsApproval, Long> {

    Optional<NonConformanceUseAsIsApproval> findByNcId(Long ncId);
}
