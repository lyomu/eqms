package com.eqms.retention;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "record_retention_policies")
@Getter
@Setter
@SQLDelete(sql = "UPDATE record_retention_policies SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class RetentionPolicy extends RegulatedEntity {

    @Column(name = "record_type", nullable = false, length = 80)
    private String recordType;

    @Column(name = "retention_years", nullable = false)
    private int retentionYears;

    @Column(name = "disposition_method", nullable = false, length = 80)
    private String dispositionMethod = "ARCHIVE_REVIEW";

    @Column(name = "legal_basis", columnDefinition = "text")
    private String legalBasis;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
