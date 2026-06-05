package com.eqms.managementreview;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ManagementReviewRepository extends JpaRepository<ManagementReview, Long> {

    Optional<ManagementReview> findByReviewNo(String reviewNo);

    Page<ManagementReview> findByMrStatus(MrStatus status, Pageable pageable);

    List<ManagementReview> findByReviewDateLessThanOrderByReviewDateDesc(LocalDate reviewDate);

    /** SCHEDULED reviews whose date has already passed — used for overdue-review reminders. */
    List<ManagementReview> findByMrStatusAndReviewDateBefore(MrStatus status, LocalDate date);
}
