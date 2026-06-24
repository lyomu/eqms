package com.eqms.audits;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "audit_meetings")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class AuditMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audit_id", nullable = false)
    private Long auditId;

    @Enumerated(EnumType.STRING)
    @Column(name = "meeting_type", nullable = false, length = 30)
    private MeetingType meetingType;

    @Column(name = "meeting_date_time")
    private Instant meetingDateTime;

    @Column(name = "attendees", columnDefinition = "text")
    private String attendees;

    @Column(name = "agenda", columnDefinition = "text")
    private String agenda;

    @Column(name = "discussion_summary", columnDefinition = "text")
    private String discussionSummary;

    @Column(name = "key_decisions", columnDefinition = "text")
    private String keyDecisions;

    @Column(name = "agreed_actions", columnDefinition = "text")
    private String agreedActions;

    @Column(name = "minutes_approved", nullable = false)
    private boolean minutesApproved = false;

    @Column(name = "approved_by_id")
    private Long approvedById;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private Long updatedBy;
}
