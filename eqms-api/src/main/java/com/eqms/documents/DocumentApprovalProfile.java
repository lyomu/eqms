package com.eqms.documents;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import com.eqms.common.RegulatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Reusable routing metadata selected when a controlled document is created. */
@Entity
@Table(name = "document_approval_profiles")
@Getter
@Setter
@SQLDelete(sql = "UPDATE document_approval_profiles SET deleted_at = now(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted_at IS NULL")
public class DocumentApprovalProfile extends RegulatedEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
