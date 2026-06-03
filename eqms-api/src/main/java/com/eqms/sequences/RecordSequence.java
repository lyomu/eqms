package com.eqms.sequences;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

/**
 * Per-module, per-year counter backing concurrency-safe record numbering (CLAUDE.md rule 6).
 *
 * <p>{@code SequenceService} increments {@code currentValue} under a {@code SELECT … FOR UPDATE}
 * pessimistic lock, so parallel callers are serialized and never receive a duplicate number.
 * Numbers are formatted via {@code format} (e.g. {@code CC-2026-001}). This is infrastructure
 * config, not a regulated business record, so it has no soft-delete column.</p>
 */
@Entity
@Table(name = "record_sequences",
        uniqueConstraints = @UniqueConstraint(name = "uq_record_sequences_module_year",
                columnNames = {"module_code", "year"}))
@Getter
@Setter
public class RecordSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Module code used in the number, e.g. CC, DEV, DOC, CAPA. */
    @Column(name = "module_code", nullable = false, length = 20)
    private String moduleCode;

    /** Year the counter belongs to (year-scoped numbering). */
    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "prefix", nullable = false, length = 20)
    private String prefix;

    /** Last value issued. The next number is {@code currentValue + 1}. */
    @Column(name = "current_value", nullable = false)
    private long currentValue = 0L;

    /** Zero-pad width for the numeric portion (e.g. 3 → 001). */
    @Column(name = "padding", nullable = false)
    private int padding = 3;

    /** Template with {@code {prefix}}, {@code {year}}, {@code {seq}} placeholders. */
    @Column(name = "format", nullable = false, length = 60)
    private String format = "{prefix}-{year}-{seq}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic-lock guard; the pessimistic FOR UPDATE lock is the primary concurrency control. */
    @Version
    @Column(name = "version", nullable = false)
    private int version;
}
