package com.eqms.oosmanagement;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosRepeatTestingRepository extends JpaRepository<OosRepeatTesting, Long> {

    Optional<OosRepeatTesting> findByOosId(Long oosId);
}
