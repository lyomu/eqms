package com.eqms.managementreview;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewMetricRepository extends JpaRepository<ReviewMetric, Long> {

    List<ReviewMetric> findByManagementReviewId(Long managementReviewId);
}
