package com.eqms.oosmanagement;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosDispositionRepository extends JpaRepository<OosDispositionRecord, Long> {

    Optional<OosDispositionRecord> findByOosId(Long oosId);
}
