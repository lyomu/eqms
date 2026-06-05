package com.eqms.managementreview;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewProductFeedbackRepository extends JpaRepository<ReviewProductFeedback, Long> {

    List<ReviewProductFeedback> findByManagementReviewId(Long managementReviewId);
}
