package com.eqms.risks;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskAnalysisRepository extends JpaRepository<RiskAnalysis, Long> {

    Optional<RiskAnalysis> findByRiskId(Long riskId);
}
