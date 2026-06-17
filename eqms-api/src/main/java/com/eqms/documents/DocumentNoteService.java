package com.eqms.documents;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.common.ResourceNotFoundException;

@Service
public class DocumentNoteService {

    private final DocumentNoteRepository repository;
    private final DocumentRepository documentRepository;

    public DocumentNoteService(DocumentNoteRepository repository, DocumentRepository documentRepository) {
        this.repository = repository;
        this.documentRepository = documentRepository;
    }

    @Transactional(readOnly = true)
    public List<DocumentNote> listNotes(Long documentId) {
        requireDocument(documentId);
        return repository.findByDocumentIdAndNoteTypeOrderByCreatedAtDesc(documentId, DocumentNote.NoteType.NOTE);
    }

    @Transactional(readOnly = true)
    public List<DocumentNote> listChangeRequests(Long documentId) {
        requireDocument(documentId);
        return repository.findByDocumentIdAndNoteTypeOrderByCreatedAtDesc(documentId, DocumentNote.NoteType.CHANGE_REQUEST);
    }

    @Transactional
    public DocumentNote addNote(Long documentId, DocumentNote.NoteType type, String content,
                                Long actorId, String actorName) {
        requireDocument(documentId);
        DocumentNote note = new DocumentNote();
        note.setDocumentId(documentId);
        note.setNoteType(type);
        note.setContent(content);
        note.setCreatedBy(actorId);
        note.setCreatedByName(actorName);
        return repository.save(note);
    }

    @Transactional
    public void deleteNote(Long documentId, Long noteId) {
        DocumentNote note = repository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found: " + noteId));
        if (!note.getDocumentId().equals(documentId)) {
            throw new ResourceNotFoundException("Note not found: " + noteId);
        }
        repository.delete(note);
    }

    private void requireDocument(Long documentId) {
        documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
    }
}
