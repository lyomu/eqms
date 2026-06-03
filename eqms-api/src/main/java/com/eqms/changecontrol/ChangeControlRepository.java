package com.eqms.changecontrol;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChangeControlRepository extends JpaRepository<ChangeControl, Long> {

    Optional<ChangeControl> findByChangeNumber(String changeNumber);

    Page<ChangeControl> findByChangeStatus(ChangeControlStatus status, Pageable pageable);
}
