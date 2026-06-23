package com.eqms.deviations;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvestigationRepository extends JpaRepository<DeviationInvestigation, Long> {

    Optional<DeviationInvestigation> findByDeviationId(Long deviationId);
}
