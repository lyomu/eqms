package com.eqms.sequences;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates concurrency-safe, gap-free record numbers such as {@code CC-2026-001}
 * (CLAUDE.md compliance rule 6).
 *
 * <p>Never computes {@code MAX(record_no)+1}. Instead it:
 * <ol>
 *   <li>ensures the per-module/per-year counter row exists ({@code INSERT … ON CONFLICT DO NOTHING});</li>
 *   <li>acquires a {@code SELECT … FOR UPDATE} pessimistic row lock on it;</li>
 *   <li>increments and persists the counter, then formats the number.</li>
 * </ol>
 * The row lock serializes concurrent callers for the same (module, year), so two callers can
 * never receive the same number. The whole operation runs in one transaction.</p>
 */
@Service
public class SequenceService {

    private static final String DEFAULT_FORMAT = "{prefix}-{year}-{seq}";
    private static final int DEFAULT_PADDING = 3;

    private final RecordSequenceRepository repository;
    private final Clock clock;

    public SequenceService(RecordSequenceRepository repository, Clock utcClock) {
        this.repository = repository;
        this.clock = utcClock;
    }

    /** Next number for a module/year, using the module code itself as the prefix. */
    @Transactional
    public String next(String moduleCode, int year) {
        return next(moduleCode, year, moduleCode, DEFAULT_PADDING, DEFAULT_FORMAT);
    }

    /**
     * Next number with explicit formatting. The prefix/padding/format are applied only when the
     * counter row is first created; subsequent calls reuse the stored configuration.
     */
    @Transactional
    public String next(String moduleCode, int year, String prefix, int padding, String format) {
        repository.insertIfAbsent(moduleCode, year, prefix, padding, format);

        RecordSequence seq = repository.lockByModuleAndYear(moduleCode, year)
                .orElseThrow(() -> new IllegalStateException(
                        "record_sequences row missing after insertIfAbsent for "
                                + moduleCode + "/" + year));

        long nextValue = seq.getCurrentValue() + 1;
        seq.setCurrentValue(nextValue);
        seq.setUpdatedAt(Instant.now(clock));
        repository.save(seq);

        return formatNumber(seq, nextValue);
    }

    private String formatNumber(RecordSequence seq, long value) {
        String seqPart = padLeft(value, seq.getPadding());
        return seq.getFormat()
                .replace("{prefix}", seq.getPrefix())
                .replace("{year}", String.valueOf(seq.getYear()))
                .replace("{seq}", seqPart);
    }

    private static String padLeft(long value, int width) {
        String s = Long.toString(value);
        if (s.length() >= width) {
            return s;
        }
        return "0".repeat(width - s.length()) + s;
    }
}
