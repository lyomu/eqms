package com.eqms.training;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingAutoRuleRepository extends JpaRepository<TrainingAutoRule, Long> {

    List<TrainingAutoRule> findByTrainingProgramId(Long trainingProgramId);
}
