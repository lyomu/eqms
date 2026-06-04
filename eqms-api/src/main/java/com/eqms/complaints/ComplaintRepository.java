package com.eqms.complaints;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    Optional<Complaint> findByComplaintNo(String complaintNo);

    Page<Complaint> findByComplaintStatus(ComplaintStatus status, Pageable pageable);

    Page<Complaint> findBySource(ComplaintSource source, Pageable pageable);

    Page<Complaint> findBySeverity(ComplaintSeverity severity, Pageable pageable);
}
