package com.eqms.managementreview;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewDecisionRepository extends JpaRepository<ReviewDecision, Long> {

    List<ReviewDecision> findByManagementReviewId(Long managementReviewId);
}
