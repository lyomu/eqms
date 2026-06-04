package com.eqms.training;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingCompletionAuditRepository extends JpaRepository<TrainingCompletionAudit, Long> {

    List<TrainingCompletionAudit> findByTrainingAssignmentId(Long trainingAssignmentId);
}
