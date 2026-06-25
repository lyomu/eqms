package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OosRetestResampleRepository extends JpaRepository<OosRetestResample, Long> {
    List<OosRetestResample> findAllByOosIdOrderByTestNumberAsc(Long oosId);
}
