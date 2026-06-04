package com.eqms.notifications;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.eqms.capa.Capa;
import com.eqms.capa.CapaRepository;

/**
 * Scheduled sweep that notifies record owners of overdue work (CLAUDE.md M10:
 * "Task overdue → notify owner"). Runs daily at 02:00 server time; the cron is deliberately
 * off-hours so it does not fire during short integration-test runs. The sweep logic is also
 * exposed as {@link #notifyOverdueCapas()} so it can be invoked directly if needed.
 */
@Component
public class OverdueNotificationJob {

    private static final Logger log = LoggerFactory.getLogger(OverdueNotificationJob.class);

    private final CapaRepository capaRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    public OverdueNotificationJob(CapaRepository capaRepository, NotificationService notificationService,
                                  Clock utcClock) {
        this.capaRepository = capaRepository;
        this.notificationService = notificationService;
        this.clock = utcClock;
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void runDailySweep() {
        int sent = notifyOverdueCapas();
        if (sent > 0) {
            log.info("Overdue sweep created {} notification(s)", sent);
        }
    }

    /** Notify the owner (creator, else submitter) of each overdue, still-open CAPA. */
    public int notifyOverdueCapas() {
        Instant now = Instant.now(clock);
        int sent = 0;
        for (Capa capa : capaRepository.findOpenWithDueDateBetween(Instant.EPOCH, now)) {
            Long owner = capa.getCreatedBy() != null ? capa.getCreatedBy() : capa.getSubmittedBy();
            if (owner == null) {
                continue;
            }
            notificationService.create(owner, NotificationType.TASK_OVERDUE,
                    "CAPA " + capa.getCapaNumber() + " is overdue",
                    "A CAPA you own has passed its due date and is still open.",
                    "Capa", String.valueOf(capa.getId()));
            sent++;
        }
        return sent;
    }
}
