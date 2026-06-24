package com.eqms.audits;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditMeetingRepository extends JpaRepository<AuditMeeting, Long> {

    List<AuditMeeting> findByAuditIdOrderByMeetingDateTimeAsc(Long auditId);
}
