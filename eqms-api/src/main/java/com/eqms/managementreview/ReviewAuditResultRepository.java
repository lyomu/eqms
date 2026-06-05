package com.eqms.managementreview;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewAuditResultRepository extends JpaRepository<ReviewAuditResult, Long> {

    List<ReviewAuditResult> findByManagementReviewId(Long managementReviewId);
}
