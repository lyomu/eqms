package com.eqms.signatures;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Read/insert only — signatures are immutable (rule 4). */
@Repository
public interface ElectronicSignatureRepository extends JpaRepository<ElectronicSignature, Long> {

    List<ElectronicSignature> findByRecordTypeAndRecordIdOrderBySignedAtDesc(String recordType, String recordId);
}
