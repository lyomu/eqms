package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OosContainmentRepository extends JpaRepository<OosContainment, Long> {
    Optional<OosContainment> findByOosId(Long oosId);
}
