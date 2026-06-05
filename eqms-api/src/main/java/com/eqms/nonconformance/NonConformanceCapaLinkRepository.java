package com.eqms.nonconformance;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NonConformanceCapaLinkRepository extends JpaRepository<NonConformanceCapaLink, Long> {

    List<NonConformanceCapaLink> findByNcId(Long ncId);

    boolean existsByNcIdAndCapaId(Long ncId, Long capaId);
}
