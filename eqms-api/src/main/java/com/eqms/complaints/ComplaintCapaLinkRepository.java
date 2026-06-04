package com.eqms.complaints;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintCapaLinkRepository extends JpaRepository<ComplaintCapaLink, Long> {

    List<ComplaintCapaLink> findByComplaintId(Long complaintId);

    boolean existsByComplaintIdAndCapaId(Long complaintId, Long capaId);
}
