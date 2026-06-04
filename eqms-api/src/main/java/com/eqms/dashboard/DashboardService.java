package com.eqms.dashboard;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.batchrecords.BatchRecord;
import com.eqms.batchrecords.BatchRecordRepository;
import com.eqms.batchrecords.BatchStatus;
import com.eqms.capa.Capa;
import com.eqms.capa.CapaRepository;
import com.eqms.capa.CapaStatus;
import com.eqms.changecontrol.ChangeControl;
import com.eqms.changecontrol.ChangeControlRepository;
import com.eqms.changecontrol.ChangeControlStatus;
import com.eqms.dashboard.dto.ComplianceStatus;
import com.eqms.dashboard.dto.DashboardStatistics;
import com.eqms.dashboard.dto.MyWork;
import com.eqms.dashboard.dto.PendingApprovals;
import com.eqms.dashboard.dto.TaskItem;
import com.eqms.deviations.Deviation;
import com.eqms.deviations.DeviationRepository;
import com.eqms.deviations.DeviationStatus;
import com.eqms.documents.Document;
import com.eqms.documents.DocumentRepository;
import com.eqms.documents.DocumentStatus;
import com.eqms.materials.Material;
import com.eqms.materials.MaterialRepository;
import com.eqms.materials.MaterialStatus;
import com.eqms.notifications.NotificationService;
import com.eqms.products.Product;
import com.eqms.products.ProductRepository;
import com.eqms.products.ProductStatus;

/**
 * Aggregates pending work, statistics and compliance posture across the regulated modules that exist
 * today (Documents, Change Control, CAPA, Deviations, Products, Materials, Batch Records). Per-user
 * queries are cached briefly via {@link TtlCache} (CLAUDE.md M10). All reads are non-mutating.
 */
@Service
public class DashboardService {

    /** Module → authority required to approve it; drives the authority-gated "my approvals" list. */
    private static final Map<String, String> APPROVE_AUTHORITY = Map.of(
            "Document", "DOCUMENT_APPROVE",
            "ChangeControl", "CHANGE_APPROVE",
            "Capa", "CAPA_APPROVE",
            "Deviation", "DEVIATION_APPROVE",
            "Material", "MATERIAL_APPROVE",
            "Product", "PRODUCT_APPROVE",
            "BatchRecord", "BATCH_RELEASE");

    private final DocumentRepository documents;
    private final ChangeControlRepository changes;
    private final CapaRepository capas;
    private final DeviationRepository deviations;
    private final ProductRepository products;
    private final MaterialRepository materials;
    private final BatchRecordRepository batches;
    private final NotificationService notifications;
    private final Clock clock;

    private final TtlCache<PendingApprovals> approvalsCache;
    private final TtlCache<MyWork> myWorkCache;

    public DashboardService(DocumentRepository documents, ChangeControlRepository changes,
                            CapaRepository capas, DeviationRepository deviations,
                            ProductRepository products, MaterialRepository materials,
                            BatchRecordRepository batches, NotificationService notifications, Clock utcClock,
                            @Value("${eqms.dashboard.cache-ttl-seconds:300}") long cacheTtlSeconds) {
        this.documents = documents;
        this.changes = changes;
        this.capas = capas;
        this.deviations = deviations;
        this.products = products;
        this.materials = materials;
        this.batches = batches;
        this.notifications = notifications;
        this.clock = utcClock;
        Duration ttl = Duration.ofSeconds(cacheTtlSeconds);
        this.approvalsCache = new TtlCache<>(ttl);
        this.myWorkCache = new TtlCache<>(ttl);
    }

    // --- Statistics & compliance (system-wide, uncached — cheap COUNT queries) -----------------

    @Transactional(readOnly = true)
    public DashboardStatistics statistics() {
        return new DashboardStatistics(
                documents.count(), documents.countByDocumentStatus(DocumentStatus.EFFECTIVE),
                changes.count(), openChangeCount(),
                capas.count(), openCapaCount(),
                deviations.count(), openDeviationCount(),
                products.count(), products.countByProductStatus(ProductStatus.ACTIVE),
                materials.count(), materials.countByMaterialStatus(MaterialStatus.APPROVED),
                batches.count(), batches.countByBatchStatus(BatchStatus.RELEASED));
    }

    @Transactional(readOnly = true)
    public ComplianceStatus complianceStatus() {
        Instant now = Instant.now(clock);
        long docsDue = documents.findDueForReview(now).size();
        long overdueCapas = capas.findOpenWithDueDateBetween(Instant.EPOCH, now).size();
        long overdueChanges = changes.findOpenWithTargetDateBetween(Instant.EPOCH, now).size();
        return new ComplianceStatus(docsDue, overdueCapas, overdueChanges,
                openDeviationCount(), batches.countByBatchStatus(BatchStatus.QUARANTINE));
    }

    // --- Per-user views (cached briefly per user) ----------------------------------------------

    @Transactional(readOnly = true)
    public PendingApprovals myApprovals(Long userId, java.util.Collection<String> authorities) {
        return approvalsCache.get(cacheKey("approvals", userId, authorities),
                () -> computeApprovals(userId, authorities));
    }

    @Transactional(readOnly = true)
    public MyWork myWork(Long userId, java.util.Collection<String> authorities) {
        return myWorkCache.get(cacheKey("mywork", userId, authorities), () -> {
            long approvals = computeApprovals(userId, authorities).total();
            long myTasks = myTasks(userId).size();
            long unread = notifications.unreadCount(userId);
            return new MyWork(approvals, myTasks, unread);
        });
    }

    /** Due-dated CAPAs/changes owned by the user (creator or submitter) that are still open. */
    @Transactional(readOnly = true)
    public List<TaskItem> myTasks(Long userId) {
        Instant horizon = Instant.now(clock).plus(3650, ChronoUnit.DAYS); // all open due-dated items
        List<TaskItem> items = new ArrayList<>();
        for (Capa c : capas.findOpenWithDueDateBetween(Instant.EPOCH, horizon)) {
            if (ownedBy(c.getCreatedBy(), c.getSubmittedBy(), userId)) {
                items.add(new TaskItem("Capa", c.getId(), c.getCapaNumber(), c.getCapaStatus().name(), c.getDueDate()));
            }
        }
        for (ChangeControl c : changes.findOpenWithTargetDateBetween(Instant.EPOCH, horizon)) {
            if (ownedBy(c.getCreatedBy(), c.getSubmittedBy(), userId)) {
                items.add(new TaskItem("ChangeControl", c.getId(), c.getChangeNumber(),
                        c.getChangeStatus().name(), c.getTargetImplementationDate()));
            }
        }
        return items;
    }

    // --- Overdue / due-soon (system-wide) ------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TaskItem> overdueItems() {
        Instant now = Instant.now(clock);
        List<TaskItem> items = new ArrayList<>();
        capas.findOpenWithDueDateBetween(Instant.EPOCH, now).forEach(c ->
                items.add(new TaskItem("Capa", c.getId(), c.getCapaNumber(), c.getCapaStatus().name(), c.getDueDate())));
        changes.findOpenWithTargetDateBetween(Instant.EPOCH, now).forEach(c ->
                items.add(new TaskItem("ChangeControl", c.getId(), c.getChangeNumber(),
                        c.getChangeStatus().name(), c.getTargetImplementationDate())));
        return items;
    }

    @Transactional(readOnly = true)
    public List<TaskItem> dueSoon() {
        Instant now = Instant.now(clock);
        Instant in7Days = now.plus(7, ChronoUnit.DAYS);
        List<TaskItem> items = new ArrayList<>();
        capas.findOpenWithDueDateBetween(now, in7Days).forEach(c ->
                items.add(new TaskItem("Capa", c.getId(), c.getCapaNumber(), c.getCapaStatus().name(), c.getDueDate())));
        changes.findOpenWithTargetDateBetween(now, in7Days).forEach(c ->
                items.add(new TaskItem("ChangeControl", c.getId(), c.getChangeNumber(),
                        c.getChangeStatus().name(), c.getTargetImplementationDate())));
        return items;
    }

    // --- internals -----------------------------------------------------------------------------

    private PendingApprovals computeApprovals(Long userId, java.util.Collection<String> authorities) {
        Map<String, Integer> byModule = new LinkedHashMap<>();
        List<TaskItem> items = new ArrayList<>();

        addApprovals(authorities, "Document", documents.findByDocumentStatus(DocumentStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                d -> ownedBy(d.getCreatedBy(), d.getSubmittedBy(), userId),
                d -> new TaskItem("Document", d.getId(), d.getDocumentNumber(), d.getDocumentStatus().name(), null),
                byModule, items);
        addApprovals(authorities, "ChangeControl", changes.findByChangeStatus(ChangeControlStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                c -> ownedBy(c.getCreatedBy(), c.getSubmittedBy(), userId),
                c -> new TaskItem("ChangeControl", c.getId(), c.getChangeNumber(), c.getChangeStatus().name(), c.getTargetImplementationDate()),
                byModule, items);
        addApprovals(authorities, "Capa", capas.findByCapaStatus(CapaStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                c -> ownedBy(c.getCreatedBy(), c.getSubmittedBy(), userId),
                c -> new TaskItem("Capa", c.getId(), c.getCapaNumber(), c.getCapaStatus().name(), c.getDueDate()),
                byModule, items);
        addApprovals(authorities, "Deviation", deviations.findByDeviationStatus(DeviationStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                d -> ownedBy(d.getCreatedBy(), d.getSubmittedBy(), userId),
                d -> new TaskItem("Deviation", d.getId(), d.getDeviationNumber(), d.getDeviationStatus().name(), null),
                byModule, items);
        addApprovals(authorities, "Material", materials.findByMaterialStatus(MaterialStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                m -> ownedBy(m.getCreatedBy(), m.getSubmittedBy(), userId),
                m -> new TaskItem("Material", m.getId(), m.getMaterialCode(), m.getMaterialStatus().name(), null),
                byModule, items);
        addApprovals(authorities, "Product", products.findByProductStatus(ProductStatus.PENDING_APPROVAL, Pageable.unpaged()).getContent(),
                p -> ownedBy(p.getCreatedBy(), p.getSubmittedBy(), userId),
                p -> new TaskItem("Product", p.getId(), p.getProductCode(), p.getProductStatus().name(), null),
                byModule, items);
        addApprovals(authorities, "BatchRecord", batches.findByBatchStatus(BatchStatus.QA_REVIEW, Pageable.unpaged()).getContent(),
                b -> ownedBy(b.getCreatedBy(), b.getSubmittedBy(), userId),
                b -> new TaskItem("BatchRecord", b.getId(), b.getBatchNo(), b.getBatchStatus().name(), null),
                byModule, items);

        return new PendingApprovals(items.size(), byModule, items);
    }

    private <T> void addApprovals(java.util.Collection<String> authorities, String module, List<T> candidates,
                                  Predicate<T> isOwner, java.util.function.Function<T, TaskItem> toItem,
                                  Map<String, Integer> byModule, List<TaskItem> items) {
        if (!authorities.contains(APPROVE_AUTHORITY.get(module))) {
            return; // user cannot approve this module — don't surface it
        }
        int count = 0;
        for (T candidate : candidates) {
            if (isOwner.test(candidate)) {
                continue; // self-approval is prohibited (rule 7) — never an actionable approval
            }
            items.add(toItem.apply(candidate));
            count++;
        }
        if (count > 0) {
            byModule.put(module, count);
        }
    }

    private long openChangeCount() {
        return countExcluding(changes.count(),
                changes.countByChangeStatus(ChangeControlStatus.CLOSED),
                changes.countByChangeStatus(ChangeControlStatus.CANCELLED),
                changes.countByChangeStatus(ChangeControlStatus.REJECTED));
    }

    private long openCapaCount() {
        return countExcluding(capas.count(),
                capas.countByCapaStatus(CapaStatus.CLOSED),
                capas.countByCapaStatus(CapaStatus.CANCELLED),
                capas.countByCapaStatus(CapaStatus.REJECTED));
    }

    private long openDeviationCount() {
        return countExcluding(deviations.count(),
                deviations.countByDeviationStatus(DeviationStatus.CLOSED),
                deviations.countByDeviationStatus(DeviationStatus.CANCELLED),
                deviations.countByDeviationStatus(DeviationStatus.REJECTED));
    }

    private static long countExcluding(long total, long... excluded) {
        long open = total;
        for (long e : excluded) {
            open -= e;
        }
        return Math.max(open, 0);
    }

    private static boolean ownedBy(Long createdBy, Long submittedBy, Long userId) {
        return Objects.equals(createdBy, userId) || Objects.equals(submittedBy, userId);
    }

    private static String cacheKey(String view, Long userId, java.util.Collection<String> authorities) {
        return view + ":" + userId + ":" + new java.util.TreeSet<>(authorities);
    }
}
