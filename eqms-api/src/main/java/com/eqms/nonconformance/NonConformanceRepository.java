package com.eqms.nonconformance;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NonConformanceRepository extends JpaRepository<NonConformance, Long> {

    Optional<NonConformance> findByNcNo(String ncNo);

    Page<NonConformance> findByNcStatus(NcStatus status, Pageable pageable);

    Page<NonConformance> findByNcType(NcType type, Pageable pageable);
}
