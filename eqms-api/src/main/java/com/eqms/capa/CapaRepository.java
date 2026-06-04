package com.eqms.capa;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CapaRepository extends JpaRepository<Capa, Long> {

    Optional<Capa> findByCapaNumber(String capaNumber);

    Page<Capa> findByCapaStatus(CapaStatus status, Pageable pageable);

    long countByCapaStatus(CapaStatus status);

    /** Open CAPAs whose due date falls within (:from, :to]. Used for overdue / due-soon dashboards. */
    @Query("""
            select c from Capa c
            where c.dueDate is not null and c.dueDate > :from and c.dueDate <= :to
              and c.capaStatus not in (com.eqms.capa.CapaStatus.CLOSED,
                                       com.eqms.capa.CapaStatus.CANCELLED,
                                       com.eqms.capa.CapaStatus.REJECTED)
            order by c.dueDate asc
            """)
    List<Capa> findOpenWithDueDateBetween(@Param("from") Instant from, @Param("to") Instant to);
}
