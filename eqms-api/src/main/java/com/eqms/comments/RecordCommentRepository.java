package com.eqms.comments;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordCommentRepository extends JpaRepository<RecordComment, Long> {
    List<RecordComment> findByRecordTypeAndRecordIdOrderByCreatedAtDesc(String recordType, String recordId);
}
