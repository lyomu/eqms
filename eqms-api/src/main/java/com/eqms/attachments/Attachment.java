package com.eqms.attachments;

import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Metadata for a file stored in S3/MinIO and attached to a regulated record. The binary lives
 * in object storage; this row holds the pointer ({@code storageKey}) and an integrity hash
 * ({@code sha256}). Regulated: soft-deleted, never hard-deleted (rule 2). Upload handling
 * lands in a later milestone.
 */
@Entity
@Table(name = "attachments")
@Getter
@Setter
@SQLDelete(sql = "UPDATE attachments SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class Attachment extends RegulatedEntity {

    @Column(name = "record_type", nullable = false, length = 80)
    private String recordType;

    @Column(name = "record_id", nullable = false, length = 80)
    private String recordId;

    @Column(name = "file_name", nullable = false, length = 400)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 160)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    /** Object-storage key; unique so the same blob is not double-registered. */
    @Column(name = "storage_key", nullable = false, length = 500, unique = true)
    private String storageKey;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;
}
