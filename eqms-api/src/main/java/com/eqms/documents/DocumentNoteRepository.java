package com.eqms.documents;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentNoteRepository extends JpaRepository<DocumentNote, Long> {
    List<DocumentNote> findByDocumentIdAndNoteTypeOrderByCreatedAtDesc(Long documentId, DocumentNote.NoteType noteType);
    List<DocumentNote> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
