package com.eqms.retention;

import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "record_legal_holds")
@Getter
@Setter
@SQLDelete(sql = "UPDATE record_legal_holds SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class LegalHold extends RegulatedEntity {

    @Column(name = "record_type", nullable = false, length = 80)
    private String recordType;

    @Column(name = "record_id", nullable = false, length = 80)
    private String recordId;

    @Column(name = "reason", nullable = false, columnDefinition = "text")
    private String reason;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "released_by")
    private Long releasedBy;

    @Column(name = "release_reason", columnDefinition = "text")
    private String releaseReason;

    public boolean active() {
        return releasedAt == null;
    }
}
