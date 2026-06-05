package com.eqms.oosmanagement;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OosCapaLinkRepository extends JpaRepository<OosCapaLink, Long> {

    List<OosCapaLink> findByOosId(Long oosId);

    boolean existsByOosIdAndCapaId(Long oosId, Long capaId);
}
