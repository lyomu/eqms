package com.eqms.oosmanagement;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosCaseRepository extends JpaRepository<OosCase, Long> {

    Optional<OosCase> findByOosNo(String oosNo);

    Page<OosCase> findByOosStatus(OosStatus status, Pageable pageable);

    Page<OosCase> findByProductId(Long productId, Pageable pageable);
}
