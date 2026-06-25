package com.eqms.oosmanagement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface OosInvestigationItemRepository extends JpaRepository<OosInvestigationItem, Long> {
    List<OosInvestigationItem> findAllByOosIdOrderByItemNumberAsc(Long oosId);
}
