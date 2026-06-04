package com.eqms.training;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingAssignmentRepository extends JpaRepository<TrainingAssignment, Long> {

    List<TrainingAssignment> findByTrainingProgramId(Long trainingProgramId);

    List<TrainingAssignment> findByUserId(Long userId);

    boolean existsByTrainingProgramIdAndUserId(Long trainingProgramId, Long userId);

    long countByStatus(AssignmentStatus status);

    /** Not-yet-completed assignments due on or before the given instant (overdue / due-soon sweeps). */
    @Query("""
            select a from TrainingAssignment a
            where a.completionDate is null and a.dueDate is not null and a.dueDate <= :asOf
            order by a.dueDate asc
            """)
    List<TrainingAssignment> findOpenDueBy(@Param("asOf") Instant asOf);

    /** Not-yet-completed assignments due within the window (:from, :to]. */
    @Query("""
            select a from TrainingAssignment a
            where a.completionDate is null and a.dueDate is not null
              and a.dueDate > :from and a.dueDate <= :to
            order by a.dueDate asc
            """)
    List<TrainingAssignment> findOpenDueBetween(@Param("from") Instant from, @Param("to") Instant to);
}
