package com.eqms.documents;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentReadAssignmentRepository extends JpaRepository<DocumentReadAssignment, Long> {

    List<DocumentReadAssignment> findByDocumentId(Long documentId);

    List<DocumentReadAssignment> findByAssignedTo(Long assignedTo);
}
