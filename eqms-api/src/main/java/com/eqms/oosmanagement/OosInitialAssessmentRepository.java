package com.eqms.oosmanagement;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosInitialAssessmentRepository extends JpaRepository<OosInitialAssessment, Long> {

    Optional<OosInitialAssessment> findByOosId(Long oosId);
}
