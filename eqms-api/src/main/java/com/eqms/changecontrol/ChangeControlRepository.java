package com.eqms.changecontrol;

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
public interface ChangeControlRepository extends JpaRepository<ChangeControl, Long> {

    Optional<ChangeControl> findByChangeNumber(String changeNumber);

    Page<ChangeControl> findByChangeStatus(ChangeControlStatus status, Pageable pageable);

    long countByChangeStatus(ChangeControlStatus status);

    /** Not-yet-implemented changes whose target implementation date falls within (:from, :to]. */
    @Query("""
            select c from ChangeControl c
            where c.targetImplementationDate is not null
              and c.targetImplementationDate > :from and c.targetImplementationDate <= :to
              and c.changeStatus not in (com.eqms.changecontrol.ChangeControlStatus.IMPLEMENTED,
                                         com.eqms.changecontrol.ChangeControlStatus.CLOSED,
                                         com.eqms.changecontrol.ChangeControlStatus.CANCELLED,
                                         com.eqms.changecontrol.ChangeControlStatus.REJECTED)
            order by c.targetImplementationDate asc
            """)
    List<ChangeControl> findOpenWithTargetDateBetween(@Param("from") Instant from, @Param("to") Instant to);
}
