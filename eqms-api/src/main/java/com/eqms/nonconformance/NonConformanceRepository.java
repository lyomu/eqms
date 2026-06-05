package com.eqms.nonconformance;

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
public interface NonConformanceRepository extends JpaRepository<NonConformance, Long> {

    Optional<NonConformance> findByNcNo(String ncNo);

    Page<NonConformance> findByNcStatus(NcStatus status, Pageable pageable);

    Page<NonConformance> findByNcType(NcType type, Pageable pageable);

    /** Open NCs (not closed) created before the given threshold — used for stale-case reminders. */
    @Query("""
            select n from NonConformance n
            where n.ncStatus <> com.eqms.nonconformance.NcStatus.CLOSED
              and n.createdAt < :threshold
            order by n.createdAt asc
            """)
    List<NonConformance> findOpenCreatedBefore(@Param("threshold") Instant threshold);
}
