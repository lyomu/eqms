package com.eqms.comments;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.shared.constants.AuditAction;

@Service
public class RecordCommentService {
    private final RecordCommentRepository repository;
    private final AuditService auditService;

    public RecordCommentService(RecordCommentRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<RecordComment> list(String recordType, String recordId) {
        return repository.findByRecordTypeAndRecordIdOrderByCreatedAtDesc(recordType, recordId);
    }

    @Transactional
    public RecordComment add(String recordType, String recordId, String content,
                             Long actorId, String actorName, String ip, String userAgent) {
        RecordComment comment = new RecordComment();
        comment.setRecordType(recordType);
        comment.setRecordId(recordId);
        comment.setContent(content.trim());
        comment.setCreatedBy(actorId);
        comment.setCreatedByName(actorName);
        RecordComment saved = repository.save(comment);

        auditService.record(AuditEntryRequest.builder()
                .recordType(recordType)
                .recordId(recordId)
                .action(AuditAction.UPDATE)
                .fieldName("comments")
                .newValue(saved.getContent())
                .reasonForChange("Comment added")
                .userId(actorId)
                .userFullName(actorName)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build());

        return saved;
    }

    @Transactional
    public void delete(String recordType, String recordId, Long commentId,
                       Long actorId, String actorName, String ip, String userAgent) {
        RecordComment comment = repository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));
        if (!comment.getRecordType().equals(recordType) || !comment.getRecordId().equals(recordId)) {
            throw new ResourceNotFoundException("Comment not found: " + commentId);
        }
        repository.delete(comment);
        auditService.record(AuditEntryRequest.builder()
                .recordType(recordType)
                .recordId(recordId)
                .action(AuditAction.SOFT_DELETE)
                .fieldName("comments")
                .oldValue(comment.getContent())
                .reasonForChange("Comment removed")
                .userId(actorId)
                .userFullName(actorName)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build());
    }
}
