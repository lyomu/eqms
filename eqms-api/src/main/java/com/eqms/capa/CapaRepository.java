package com.eqms.capa;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CapaRepository extends JpaRepository<Capa, Long> {

    Optional<Capa> findByCapaNumber(String capaNumber);

    Page<Capa> findByCapaStatus(CapaStatus status, Pageable pageable);
}
