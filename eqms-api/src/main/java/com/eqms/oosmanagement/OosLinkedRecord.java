package com.eqms.oosmanagement;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
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
@Table(name = "oos_linked_records")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosLinkedRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "linked_record_type", nullable = false, length = 40)
    private OosLinkedRecordType linkedRecordType;

    @Column(name = "linked_record_id", nullable = false, length = 100)
    private String linkedRecordId;

    @Column(name = "linked_record_reference", length = 200)
    private String linkedRecordReference;

    @Column(name = "linked_record_title", length = 400)
    private String linkedRecordTitle;

    @Column(name = "linked_record_status", length = 100)
    private String linkedRecordStatus;

    @Column(name = "relationship_type", length = 40)
    private String relationshipType;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "added_by")
    private Long addedBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
}
