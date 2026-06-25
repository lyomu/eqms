package com.eqms.documents;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentApprovalProfileRepository extends JpaRepository<DocumentApprovalProfile, Long> {
    List<DocumentApprovalProfile> findByActiveTrueOrderByNameAsc();
}
