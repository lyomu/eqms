package com.eqms.documents;

import java.time.Instant;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

/**
 * An immutable snapshot of a document captured at a meaningful lifecycle point (creation, approval).
 * Append-only history (never updated/deleted), mirroring {@link com.eqms.signatures.ElectronicSignature}.
 */
@Entity
@Table(name = "document_versions")
@Immutable
@Getter
public class DocumentVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false, updatable = false)
    private Long documentId;

    @Column(name = "major_version", nullable = false, updatable = false)
    private int majorVersion;

    @Column(name = "version_label", nullable = false, length = 40, updatable = false)
    private String versionLabel;

    @Column(name = "status", nullable = false, length = 40, updatable = false)
    private String status;

    @Column(name = "title", nullable = false, length = 400, updatable = false)
    private String title;

    @Column(name = "content", columnDefinition = "text", updatable = false)
    private String content;

    @Column(name = "change_notes", columnDefinition = "text", updatable = false)
    private String changeNotes;

    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @Column(name = "created_by_name", length = 200, updatable = false)
    private String createdByName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DocumentVersion() {
        // for JPA
    }

    private DocumentVersion(Builder b) {
        this.documentId = b.documentId;
        this.majorVersion = b.majorVersion;
        this.versionLabel = b.versionLabel;
        this.status = b.status;
        this.title = b.title;
        this.content = b.content;
        this.changeNotes = b.changeNotes;
        this.createdBy = b.createdBy;
        this.createdByName = b.createdByName;
        this.createdAt = b.createdAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private Long documentId;
        private int majorVersion;
        private String versionLabel;
        private String status;
        private String title;
        private String content;
        private String changeNotes;
        private Long createdBy;
        private String createdByName;
        private Instant createdAt;

        public Builder documentId(Long v) { this.documentId = v; return this; }
        public Builder majorVersion(int v) { this.majorVersion = v; return this; }
        public Builder versionLabel(String v) { this.versionLabel = v; return this; }
        public Builder status(String v) { this.status = v; return this; }
        public Builder title(String v) { this.title = v; return this; }
        public Builder content(String v) { this.content = v; return this; }
        public Builder changeNotes(String v) { this.changeNotes = v; return this; }
        public Builder createdBy(Long v) { this.createdBy = v; return this; }
        public Builder createdByName(String v) { this.createdByName = v; return this; }
        public Builder createdAt(Instant v) { this.createdAt = v; return this; }

        public DocumentVersion build() {
            return new DocumentVersion(this);
        }
    }
}
