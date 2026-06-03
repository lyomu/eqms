package com.eqms.capa;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CapaActionRepository extends JpaRepository<CapaAction, Long> {

    List<CapaAction> findByCapaIdOrderByIdAsc(Long capaId);
}
