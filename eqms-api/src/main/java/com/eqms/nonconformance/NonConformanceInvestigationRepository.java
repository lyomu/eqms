package com.eqms.nonconformance;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NonConformanceInvestigationRepository extends JpaRepository<NonConformanceInvestigation, Long> {

    Optional<NonConformanceInvestigation> findByNcId(Long ncId);
}
