package com.eqms.oosmanagement;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OosCaseRepository extends JpaRepository<OosCase, Long> {

    Optional<OosCase> findByOosNo(String oosNo);

    Page<OosCase> findByOosStatus(OosStatus status, Pageable pageable);

    Page<OosCase> findByProductId(Long productId, Pageable pageable);

    /** Open OOS cases (not closed) reported before the given threshold — used for stale-case reminders. */
    @Query("""
            select o from OosCase o
            where o.oosStatus <> com.eqms.oosmanagement.OosStatus.CLOSED
              and o.reportedDate < :threshold
            order by o.reportedDate asc
            """)
    List<OosCase> findOpenReportedBefore(@Param("threshold") Instant threshold);
}
