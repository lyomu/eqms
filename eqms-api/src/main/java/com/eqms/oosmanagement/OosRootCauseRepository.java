package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OosRootCauseRepository extends JpaRepository<OosRootCause, Long> {
    Optional<OosRootCause> findByOosId(Long oosId);
}
