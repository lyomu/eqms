package com.eqms.documents;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByDocumentNumber(String documentNumber);

    Page<Document> findByDocumentStatus(DocumentStatus status, Pageable pageable);

    long countByDocumentStatus(DocumentStatus status);

    /** Effective documents whose periodic review is due on or before the given instant. */
    @Query("""
            select d from Document d
            where d.documentStatus = com.eqms.documents.DocumentStatus.EFFECTIVE
              and d.nextReviewDate is not null
              and d.nextReviewDate <= :asOf
            order by d.nextReviewDate asc
            """)
    List<Document> findDueForReview(@Param("asOf") Instant asOf);
}
