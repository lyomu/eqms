package com.eqms.notifications;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.eqms.capa.Capa;
import com.eqms.capa.CapaRepository;
import com.eqms.equipment.Equipment;
import com.eqms.equipment.EquipmentRepository;
import com.eqms.equipment.EquipmentStatus;
import com.eqms.managementreview.ManagementReview;
import com.eqms.managementreview.ManagementReviewRepository;
import com.eqms.managementreview.MrStatus;
import com.eqms.nonconformance.NonConformance;
import com.eqms.nonconformance.NonConformanceRepository;
import com.eqms.oosmanagement.OosCase;
import com.eqms.oosmanagement.OosCaseRepository;
import com.eqms.training.TrainingAssignment;
import com.eqms.training.TrainingAssignmentRepository;

/**
 * Daily sweep for all QMS reminder notifications. Runs at 02:00 server time.
 * Uses {@link NotificationDispatcher#dispatchToUser} so each reminder generates
 * both an in-app notification and an email to the responsible user.
 *
 * Thresholds:
 *   - Calibration: equipment whose next-calibration-date is within 30 days.
 *   - Training: assignments whose due-date has already passed.
 *   - OOS: open cases reported more than 30 days ago (SLA per M17 spec).
 *   - NC: open non-conformances created more than 30 days ago.
 *   - Management review: SCHEDULED reviews whose date has already passed.
 */
@Component
public class OverdueNotificationJob {

    private static final Logger log = LoggerFactory.getLogger(OverdueNotificationJob.class);

    private static final int CALIBRATION_WARN_DAYS = 30;
    private static final Duration OOS_SLA = Duration.ofDays(30);
    private static final Duration NC_SLA = Duration.ofDays(30);

    private final CapaRepository capaRepository;
    private final EquipmentRepository equipmentRepository;
    private final TrainingAssignmentRepository trainingAssignmentRepository;
    private final OosCaseRepository oosCaseRepository;
    private final NonConformanceRepository nonConformanceRepository;
    private final ManagementReviewRepository managementReviewRepository;
    private final NotificationDispatcher dispatcher;
    private final Clock clock;

    public OverdueNotificationJob(CapaRepository capaRepository,
                                  EquipmentRepository equipmentRepository,
                                  TrainingAssignmentRepository trainingAssignmentRepository,
                                  OosCaseRepository oosCaseRepository,
                                  NonConformanceRepository nonConformanceRepository,
                                  ManagementReviewRepository managementReviewRepository,
                                  NotificationDispatcher dispatcher,
                                  Clock utcClock) {
        this.capaRepository = capaRepository;
        this.equipmentRepository = equipmentRepository;
        this.trainingAssignmentRepository = trainingAssignmentRepository;
        this.oosCaseRepository = oosCaseRepository;
        this.nonConformanceRepository = nonConformanceRepository;
        this.managementReviewRepository = managementReviewRepository;
        this.dispatcher = dispatcher;
        this.clock = utcClock;
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void runDailySweep() {
        int total = 0;
        total += notifyOverdueCapas();
        total += notifyCalibrationDue();
        total += notifyOverdueTraining();
        total += notifyStaleOos();
        total += notifyStaleNc();
        total += notifyOverdueManagementReviews();
        if (total > 0) {
            log.info("Daily QMS reminder sweep dispatched {} notification(s)", total);
        }
    }

    int notifyOverdueCapas() {
        Instant now = Instant.now(clock);
        int sent = 0;
        for (Capa capa : capaRepository.findOpenWithDueDateBetween(Instant.EPOCH, now)) {
            Long owner = capa.getCreatedBy() != null ? capa.getCreatedBy() : capa.getSubmittedBy();
            if (owner == null) continue;
            dispatcher.dispatchToUser(owner, NotificationType.TASK_OVERDUE,
                    "CAPA " + capa.getCapaNumber() + " is overdue",
                    "CAPA " + capa.getCapaNumber() + " has passed its due date and is still open.",
                    "Capa", String.valueOf(capa.getId()));
            sent++;
        }
        return sent;
    }

    int notifyCalibrationDue() {
        LocalDate cutoff = LocalDate.now(clock).plusDays(CALIBRATION_WARN_DAYS);
        List<Equipment> due = equipmentRepository.findDueForCalibration(cutoff,
                List.of(EquipmentStatus.RETIRED, EquipmentStatus.OUT_OF_CALIBRATION));
        int sent = 0;
        for (Equipment e : due) {
            Long owner = e.getOwnerId() != null ? e.getOwnerId() : e.getCreatedBy();
            if (owner == null) continue;
            dispatcher.dispatchToUser(owner, NotificationType.CALIBRATION_DUE,
                    "Calibration due: " + e.getEquipmentName(),
                    "Equipment " + e.getEquipmentCode() + " (" + e.getEquipmentName()
                            + ") has a calibration due on or before " + cutoff + ".",
                    "Equipment", String.valueOf(e.getId()));
            sent++;
        }
        return sent;
    }

    int notifyOverdueTraining() {
        Instant now = Instant.now(clock);
        List<TrainingAssignment> overdue = trainingAssignmentRepository.findOpenDueBy(now);
        int sent = 0;
        for (TrainingAssignment a : overdue) {
            if (a.getUserId() == null) continue;
            dispatcher.dispatchToUser(a.getUserId(), NotificationType.TRAINING_OVERDUE,
                    "Training assignment overdue",
                    "A training assignment is past its due date and has not been completed. "
                            + "Please complete it as soon as possible.",
                    "TrainingAssignment", String.valueOf(a.getId()));
            sent++;
        }
        return sent;
    }

    int notifyStaleOos() {
        Instant threshold = Instant.now(clock).minus(OOS_SLA);
        List<OosCase> stale = oosCaseRepository.findOpenReportedBefore(threshold);
        int sent = 0;
        for (OosCase o : stale) {
            Long owner = o.getReportedById() != null ? o.getReportedById() : o.getCreatedBy();
            if (owner == null) continue;
            dispatcher.dispatchToUser(owner, NotificationType.OOS_STALE,
                    "OOS case " + o.getOosNo() + " has been open over 30 days",
                    "OOS case " + o.getOosNo() + " was reported more than 30 days ago and is still open. "
                            + "Please review and progress this case.",
                    "OosCase", String.valueOf(o.getId()));
            sent++;
        }
        return sent;
    }

    int notifyStaleNc() {
        Instant threshold = Instant.now(clock).minus(NC_SLA);
        List<NonConformance> stale = nonConformanceRepository.findOpenCreatedBefore(threshold);
        int sent = 0;
        for (NonConformance nc : stale) {
            Long owner = nc.getOwnerId() != null ? nc.getOwnerId() : nc.getCreatedBy();
            if (owner == null) continue;
            dispatcher.dispatchToUser(owner, NotificationType.NC_STALE,
                    "Non-conformance " + nc.getNcNo() + " has been open over 30 days",
                    "Non-conformance " + nc.getNcNo() + " was raised more than 30 days ago and is still open. "
                            + "Please review and progress this item.",
                    "NonConformance", String.valueOf(nc.getId()));
            sent++;
        }
        return sent;
    }

    int notifyOverdueManagementReviews() {
        LocalDate today = LocalDate.now(clock);
        List<ManagementReview> overdue = managementReviewRepository
                .findByMrStatusAndReviewDateBefore(MrStatus.SCHEDULED, today);
        int sent = 0;
        for (ManagementReview mr : overdue) {
            Long owner = mr.getCreatedBy() != null ? mr.getCreatedBy() : mr.getSubmittedBy();
            if (owner == null) continue;
            dispatcher.dispatchToUser(owner, NotificationType.MANAGEMENT_REVIEW_OVERDUE,
                    "Management review " + mr.getReviewNo() + " is overdue",
                    "Management review " + mr.getReviewNo() + " was scheduled for " + mr.getReviewDate()
                            + " and has not been started. Please action this review.",
                    "ManagementReview", String.valueOf(mr.getId()));
            sent++;
        }
        return sent;
    }
}
