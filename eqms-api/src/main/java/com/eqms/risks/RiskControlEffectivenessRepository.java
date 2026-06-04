package com.eqms.risks;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskControlEffectivenessRepository extends JpaRepository<RiskControlEffectiveness, Long> {

    List<RiskControlEffectiveness> findByRiskIdOrderByVerificationDateDesc(Long riskId);
}
