package com.eqms.deviations;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContainmentActionRepository extends JpaRepository<ContainmentAction, Long> {

    List<ContainmentAction> findByDeviationIdAndDeletedAtIsNull(Long deviationId);
}
