package com.eqms.complaints;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintInvestigationRepository extends JpaRepository<ComplaintInvestigation, Long> {

    Optional<ComplaintInvestigation> findByComplaintId(Long complaintId);
}
