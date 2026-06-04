package com.eqms.training;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, Long> {

    Optional<TrainingProgram> findByTrainingCode(String trainingCode);

    Page<TrainingProgram> findByIntendedAudience(TrainingAudience audience, Pageable pageable);
}
