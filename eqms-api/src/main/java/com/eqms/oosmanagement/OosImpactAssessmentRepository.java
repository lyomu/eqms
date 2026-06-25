package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OosImpactAssessmentRepository extends JpaRepository<OosImpactAssessment, Long> {
    Optional<OosImpactAssessment> findByOosId(Long oosId);
}
