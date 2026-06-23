package com.eqms.deviations;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImpactAssessmentRepository extends JpaRepository<DeviationImpactAssessment, Long> {

    Optional<DeviationImpactAssessment> findByDeviationId(Long deviationId);
}
