package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OosEvidenceRepository extends JpaRepository<OosEvidence, Long> {
    List<OosEvidence> findAllByOosIdOrderByEvidenceNumberAsc(Long oosId);
}
