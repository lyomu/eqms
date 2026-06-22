package com.eqms.comments.dto;

import java.time.Instant;

import com.eqms.comments.RecordComment;

public record RecordCommentResponse(
        Long id,
        String recordType,
        String recordId,
        String content,
        Long createdBy,
        String createdByName,
        Instant createdAt
) {
    public static RecordCommentResponse from(RecordComment comment) {
        return new RecordCommentResponse(
                comment.getId(),
                comment.getRecordType(),
                comment.getRecordId(),
                comment.getContent(),
                comment.getCreatedBy(),
                comment.getCreatedByName(),
                comment.getCreatedAt());
    }
}
