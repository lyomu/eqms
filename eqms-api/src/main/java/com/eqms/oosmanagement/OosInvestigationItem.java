package com.eqms.oosmanagement;

import java.time.Instant;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
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
@Table(name = "oos_investigation_items")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
public class OosInvestigationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "oos_id", nullable = false)
    private Long oosId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 40)
    private OosInvestigationItemType itemType;

    @Column(name = "item_number", nullable = false)
    private int itemNumber = 1;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "finding", columnDefinition = "text")
    private String finding;

    @Column(name = "source", length = 200)
    private String source;

    @Column(name = "evidence_ref", length = 400)
    private String evidenceRef;

    @Column(name = "performed_by_id")
    private Long performedById;

    @Column(name = "performed_date")
    private Instant performedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_status", nullable = false, length = 20)
    private OosInvestigationItemStatus itemStatus = OosInvestigationItemStatus.OPEN;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;
}
