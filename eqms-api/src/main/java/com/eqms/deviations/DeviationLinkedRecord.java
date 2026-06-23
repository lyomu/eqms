package com.eqms.deviations;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A cross-module link from a deviation to another QMS record (e.g. CAPA, Change Control). */
@Entity
@Table(name = "deviation_linked_records")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviationLinkedRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deviation_id", nullable = false)
    private Long deviationId;

    @Column(name = "linked_record_type", nullable = false, length = 40)
    private String linkedRecordType;

    @Column(name = "linked_record_id", nullable = false)
    private Long linkedRecordId;

    @Column(name = "linked_record_number", length = 100)
    private String linkedRecordNumber;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
