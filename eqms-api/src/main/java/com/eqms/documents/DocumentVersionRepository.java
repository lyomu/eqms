package com.eqms.documents;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Read/insert only — version snapshots are immutable history. */
@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {

    List<DocumentVersion> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
