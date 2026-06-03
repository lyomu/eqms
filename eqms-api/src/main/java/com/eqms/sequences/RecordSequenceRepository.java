package com.eqms.sequences;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository
public interface RecordSequenceRepository extends JpaRepository<RecordSequence, Long> {

    /**
     * Fetch the counter row for a module/year holding a {@code SELECT … FOR UPDATE} row lock
     * (rule 6). Concurrent callers block here until the holder's transaction commits, which is
     * what guarantees no duplicate numbers are issued.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RecordSequence s where s.moduleCode = :moduleCode and s.year = :year")
    Optional<RecordSequence> lockByModuleAndYear(@Param("moduleCode") String moduleCode,
                                                 @Param("year") int year);

    Optional<RecordSequence> findByModuleCodeAndYear(String moduleCode, int year);

    /**
     * Atomically create the counter row only if it does not already exist. {@code ON CONFLICT
     * DO NOTHING} makes concurrent first-use race-free: exactly one row is created for a
     * (module, year), the rest no-op. Seeds {@code current_value = 0}.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            INSERT INTO record_sequences
                (module_code, year, prefix, current_value, padding, format, created_at, updated_at, version)
            VALUES
                (:moduleCode, :year, :prefix, 0, :padding, :format, now(), now(), 0)
            ON CONFLICT (module_code, year) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(@Param("moduleCode") String moduleCode,
                        @Param("year") int year,
                        @Param("prefix") String prefix,
                        @Param("padding") int padding,
                        @Param("format") String format);
}
