package com.eqms.risks;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskMitigationRepository extends JpaRepository<RiskMitigation, Long> {

    List<RiskMitigation> findByRiskIdOrderByIdAsc(Long riskId);

    long countByRiskId(Long riskId);
}
