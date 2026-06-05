package com.eqms.oosmanagement;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosInvestigationRepository extends JpaRepository<OosInvestigation, Long> {

    Optional<OosInvestigation> findByOosId(Long oosId);
}
