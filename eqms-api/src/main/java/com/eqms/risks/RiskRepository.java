package com.eqms.risks;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskRepository extends JpaRepository<Risk, Long> {

    Optional<Risk> findByRiskNo(String riskNo);

    Page<Risk> findByRiskStatus(RiskStatus status, Pageable pageable);

    Page<Risk> findByCategory(RiskCategory category, Pageable pageable);
}
