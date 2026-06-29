package com.eqms.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.eqms.equipment.Equipment;
import com.eqms.equipment.EquipmentRepository;
import com.eqms.equipment.EquipmentStatus;
import com.eqms.equipment.EquipmentType;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.managementreview.ManagementReview;
import com.eqms.managementreview.ManagementReviewRepository;
import com.eqms.managementreview.MrStatus;
import com.eqms.nonconformance.NcStatus;
import com.eqms.nonconformance.NcType;
import com.eqms.nonconformance.NonConformance;
import com.eqms.nonconformance.NonConformanceRepository;
import com.eqms.oosmanagement.OosCase;
import com.eqms.oosmanagement.OosCaseRepository;
import com.eqms.oosmanagement.OosStatus;
import com.eqms.sequences.SequenceService;
import com.eqms.support.AbstractIntegrationTest;
import com.eqms.training.AssignmentStatus;
import com.eqms.training.TrainingAssignment;
import com.eqms.training.TrainingAssignmentRepository;
import com.eqms.training.TrainingAudience;
import com.eqms.training.TrainingFrequency;
import com.eqms.training.TrainingProgram;
import com.eqms.training.TrainingProgramRepository;

class ReminderJobIntegrationTest extends AbstractIntegrationTest {

    @Autowired OverdueNotificationJob job;
    @Autowired NotificationRepository notificationRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired TrainingAssignmentRepository trainingAssignmentRepository;
    @Autowired TrainingProgramRepository trainingProgramRepository;
    @Autowired OosCaseRepository oosCaseRepository;
    @Autowired NonConformanceRepository nonConformanceRepository;
    @Autowired ManagementReviewRepository managementReviewRepository;
    @Autowired SequenceService sequenceService;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired Clock clock;

    @Test
    void calibrationDueNotificationSentForEquipmentDueSoon() {
        User owner = newUser("cal-owner");
        Equipment e = new Equipment();
        e.setEquipmentCode(sequenceService.next("EQUIP", 2026));
        e.setEquipmentName("Test Balance " + UUID.randomUUID());
        e.setEquipmentType(EquipmentType.BALANCE);
        e.setEquipmentStatus(EquipmentStatus.IN_CALIBRATION);
        e.setOwnerId(owner.getId());
        // Due in 5 days — within the 30-day window
        e.setNextCalibrationDate(LocalDate.now(clock).plusDays(5));
        e = equipmentRepository.save(e);

        int sent = job.notifyCalibrationDue();

        assertThat(sent).isGreaterThanOrEqualTo(1);
        assertNotificationCreated(owner.getId(), NotificationType.CALIBRATION_DUE, "Equipment", e.getId());
        equipmentRepository.delete(e);
    }

    @Test
    void trainingOverdueNotificationSent() {
        User trainee = newUser("trn-owner");
        // Need a real training program to satisfy the FK constraint
        TrainingProgram prog = new TrainingProgram();
        prog.setTrainingCode(sequenceService.next("TRN", 2026));
        prog.setTitle("Reminder Test Program " + UUID.randomUUID());
        prog.setIntendedAudience(TrainingAudience.QA);
        prog.setRequiredFrequency(TrainingFrequency.ANNUAL);
        prog = trainingProgramRepository.save(prog);

        TrainingAssignment a = new TrainingAssignment();
        a.setTrainingProgramId(prog.getId());
        a.setUserId(trainee.getId());
        a.setStatus(AssignmentStatus.ASSIGNED);
        a.setAssignedDate(Instant.now(clock));
        // Due 10 days ago
        a.setDueDate(Instant.now(clock).minus(10, ChronoUnit.DAYS));
        a = trainingAssignmentRepository.save(a);

        int sent = job.notifyOverdueTraining();

        assertThat(sent).isGreaterThanOrEqualTo(1);
        assertNotificationCreated(trainee.getId(), NotificationType.TRAINING_OVERDUE, "TrainingAssignment", a.getId());
        trainingAssignmentRepository.delete(a);
        trainingProgramRepository.delete(prog);
    }

    @Test
    void staleOosNotificationSent() {
        User reporter = newUser("oos-owner");
        OosCase oos = new OosCase();
        oos.setOosNo(sequenceService.next("OOS", 2026));
        oos.setTestMethod("Assay");
        oos.setReportedResult("88%");
        oos.setOosStatus(OosStatus.INVESTIGATING);
        // Reported 35 days ago — past SLA
        oos.setReportedDate(Instant.now(clock).minus(35, ChronoUnit.DAYS));
        oos.setReportedById(reporter.getId());
        oos = oosCaseRepository.save(oos);

        int sent = job.notifyStaleOos();

        assertThat(sent).isGreaterThanOrEqualTo(1);
        assertNotificationCreated(reporter.getId(), NotificationType.OOS_STALE, "OosCase", oos.getId());
        oosCaseRepository.delete(oos);
    }

    @Test
    void staleNcQueryFindsRecentlyCreatedNc() {
        // Can't back-date createdAt (JPA auditing sets it). Instead verify that
        // the findOpenCreatedBefore query correctly picks up an open NC when the
        // threshold is in the future (i.e. it was created "before" that future date).
        NonConformance nc = new NonConformance();
        nc.setNcNo(sequenceService.next("NC", 2026));
        nc.setTitle("Query test NC");
        nc.setDescription("Verifying stale-NC query");
        nc.setNcType(NcType.MATERIAL);
        nc.setNcStatus(NcStatus.INVESTIGATING);
        nc.setOwnerId(1L);
        final NonConformance saved = nonConformanceRepository.save(nc);

        Instant futureThreshold = Instant.now(clock).plus(1, ChronoUnit.DAYS);
        assertThat(nonConformanceRepository.findOpenCreatedBefore(futureThreshold))
                .anyMatch(n -> n.getId().equals(saved.getId()));

        // Verify that a past threshold does NOT find this freshly-created NC
        Instant pastThreshold = Instant.now(clock).minus(1, ChronoUnit.DAYS);
        assertThat(nonConformanceRepository.findOpenCreatedBefore(pastThreshold))
                .noneMatch(n -> n.getId().equals(saved.getId()));

        nonConformanceRepository.delete(saved);
    }

    @Test
    void overdueManagementReviewNotificationSent() {
        User submitter = newUser("mr-owner");
        ManagementReview mr = new ManagementReview();
        mr.setReviewNo(sequenceService.next("MR", 2026));
        mr.setReviewDate(LocalDate.now(clock).minusDays(5)); // past due
        mr.setMrStatus(MrStatus.SCHEDULED);
        mr.setParticipants("QA Director");
        mr.setScope("Annual review");
        // JPA auditing only sets createdBy when a user is in the security context.
        // Set submittedBy explicitly so the job's owner fallback finds a non-null owner.
        mr.setSubmittedBy(submitter.getId());
        mr = managementReviewRepository.save(mr);

        int sent = job.notifyOverdueManagementReviews();

        assertThat(sent).isGreaterThanOrEqualTo(1);
        assertNotificationCreated(submitter.getId(), NotificationType.MANAGEMENT_REVIEW_OVERDUE,
                "ManagementReview", mr.getId());
        managementReviewRepository.delete(mr);
    }

    private void assertNotificationCreated(Long recipientUserId, NotificationType type, String recordType, Long recordId) {
        String sourceId = String.valueOf(recordId);
        boolean exists = false;
        for (int attempt = 0; attempt < 20; attempt++) {
            exists = notificationRepository.existsByRecipientUserIdAndTypeAndRecordTypeAndRecordId(
                    recipientUserId, type, recordType, sourceId);
            if (exists) {
                break;
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        assertThat(exists).isTrue();
    }

    private User newUser(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail(prefix + "-" + suffix + "@test.io");
        user.setUsername(prefix + "-" + suffix);
        user.setFullName("Reminder User " + suffix);
        user.setPasswordHash(passwordEncoder.encode("Password123!"));
        user.setStatus(User.UserStatus.ACTIVE);
        return userRepository.save(user);
    }
}
