package com.eqms.training;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    List<TrainingSession> findByTrainingProgramIdOrderBySessionIndexAsc(Long trainingProgramId);
}
