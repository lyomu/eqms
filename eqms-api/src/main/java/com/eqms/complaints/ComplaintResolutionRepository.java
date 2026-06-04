package com.eqms.complaints;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintResolutionRepository extends JpaRepository<ComplaintResolution, Long> {

    Optional<ComplaintResolution> findByComplaintId(Long complaintId);
}
