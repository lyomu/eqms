package com.eqms.managementreview;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewActionItemRepository extends JpaRepository<ReviewActionItem, Long> {

    List<ReviewActionItem> findByManagementReviewId(Long managementReviewId);

    List<ReviewActionItem> findByManagementReviewIdIn(List<Long> managementReviewIds);
}
