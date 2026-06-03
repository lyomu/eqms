package com.eqms.deviations;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviationRepository extends JpaRepository<Deviation, Long> {

    Optional<Deviation> findByDeviationNumber(String deviationNumber);

    Page<Deviation> findByDeviationStatus(DeviationStatus status, Pageable pageable);
}
