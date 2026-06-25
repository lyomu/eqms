package com.eqms.attachments;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.shared.constants.AuditAction;

@Service
public class AttachmentService {

    private final AttachmentRepository repository;
    private final StorageService storageService;
    private final AuditService auditService;
    private final Clock clock;

    public AttachmentService(AttachmentRepository repository, StorageService storageService,
                             AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.storageService = storageService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    /**
     * Upload a file and attach it to the given regulated record. The file bytes are streamed
     * to object storage; a SHA-256 hash is computed in-transit for integrity verification.
     * The storage key and hash are persisted in the regulated {@code attachments} table.
     */
    @Transactional
    public Attachment upload(String recordType, String recordId, MultipartFile file,
                             String attachmentRole, Long actorId, String actorName, String ip, String ua) {
        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "unnamed";
        String contentType = file.getContentType() != null
                ? file.getContentType() : "application/octet-stream";
        long size = file.getSize();

        String key = recordType.toLowerCase() + "/" + recordId + "/"
                + UUID.randomUUID() + "-" + originalName;

        String sha256;
        try (InputStream raw = file.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream dis = new DigestInputStream(raw, digest)) {
                storageService.put(key, dis, size, contentType);
            }
            sha256 = HexFormat.of().formatHex(digest.digest());
        } catch (IOException | NoSuchAlgorithmException e) {
            throw new StorageException("Failed to upload attachment: " + e.getMessage(), e);
        }

        Attachment attachment = new Attachment();
        attachment.setRecordType(recordType);
        attachment.setRecordId(recordId);
        attachment.setFileName(originalName);
        attachment.setContentType(contentType);
        attachment.setSizeBytes(size);
        attachment.setStorageKey(key);
        attachment.setSha256(sha256);
        attachment.setAttachmentRole(normalizeRole(attachmentRole));
        attachment.setUploadedBy(actorId);
        attachment.setUploadedAt(Instant.now(clock));
        attachment = repository.save(attachment);

        auditService.record(AuditEntryRequest.builder()
                .recordType(recordType).recordId(recordId)
                .action(AuditAction.CREATE).fieldName("attachment")
                .newValue(originalName + " [sha256:" + sha256 + "]")
                .reasonForChange("File uploaded")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());

        return attachment;
    }

    private static String normalizeRole(String role) {
        if (role == null || role.isBlank()) return "SUPPORTING";
        String normalized = role.trim().toUpperCase(java.util.Locale.ROOT);
        return switch (normalized) {
            case "SOURCE", "SUPPORTING" -> normalized;
            default -> throw new IllegalArgumentException("Unsupported attachment role: " + role);
        };
    }

    /** Download: return the storage key and metadata so the controller can stream the bytes. */
    @Transactional
    public AttachmentDownload download(Long attachmentId, Long actorId, String actorName,
                                       String ip, String ua) {
        Attachment meta = repository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));

        auditService.record(AuditEntryRequest.builder()
                .recordType(meta.getRecordType()).recordId(meta.getRecordId())
                .action(AuditAction.EXPORT).fieldName("attachment")
                .newValue(meta.getFileName())
                .reasonForChange("Attachment downloaded")
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());

        return new AttachmentDownload(meta, storageService.get(meta.getStorageKey()));
    }

    @Transactional(readOnly = true)
    public List<Attachment> listForRecord(String recordType, String recordId) {
        return repository.findByRecordTypeAndRecordId(recordType, recordId);
    }

    public record AttachmentDownload(Attachment metadata, InputStream stream) {
    }
}
