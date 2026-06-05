package com.eqms.managementreview;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.managementreview.dto.AddActionItemRequest;
import com.eqms.managementreview.dto.AddAuditResultRequest;
import com.eqms.managementreview.dto.AddMetricRequest;
import com.eqms.managementreview.dto.AddProductFeedbackRequest;
import com.eqms.managementreview.dto.ApproveReviewRequest;
import com.eqms.managementreview.dto.CreateManagementReviewRequest;
import com.eqms.managementreview.dto.RecordDecisionRequest;
import com.eqms.managementreview.dto.ReviewReportResponse;
import com.eqms.managementreview.dto.UpdateManagementReviewRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

@Service
public class ManagementReviewService {

    private static final String MR_PREFIX = "MR";

    private final ManagementReviewRepository repository;
    private final ReviewMetricRepository metricRepository;
    private final ReviewAuditResultRepository auditResultRepository;
    private final ReviewProductFeedbackRepository productFeedbackRepository;
    private final ReviewActionItemRepository actionItemRepository;
    private final ReviewDecisionRepository decisionRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public ManagementReviewService(ManagementReviewRepository repository,
                                   ReviewMetricRepository metricRepository,
                                   ReviewAuditResultRepository auditResultRepository,
                                   ReviewProductFeedbackRepository productFeedbackRepository,
                                   ReviewActionItemRepository actionItemRepository,
                                   ReviewDecisionRepository decisionRepository,
                                   SequenceService sequenceService, WorkflowService workflowService,
                                   SignatureService signatureService, AuditService auditService,
                                   Clock utcClock) {
        this.repository = repository;
        this.metricRepository = metricRepository;
        this.auditResultRepository = auditResultRepository;
        this.productFeedbackRepository = productFeedbackRepository;
        this.actionItemRepository = actionItemRepository;
        this.decisionRepository = decisionRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public ManagementReview create(CreateManagementReviewRequest request, Long actorId, String actorName,
                                   String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(MR_PREFIX, year);

        ManagementReview review = new ManagementReview();
        review.setReviewNo(number);
        review.setReviewDate(request.reviewDate());
        review.setParticipants(request.participants());
        review.setScope(request.scope());
        review.setMrStatus(MrStatus.SCHEDULED);
        review = repository.save(review);

        audit(review.getId(), AuditAction.CREATE, null, null, number,
                "Management review scheduled", actorId, actorName, ip, ua);
        return review;
    }

    @Transactional(readOnly = true)
    public Page<ManagementReview> list(MrStatus status, Pageable pageable) {
        return status != null ? repository.findByMrStatus(status, pageable) : repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public ManagementReview get(Long id) {
        return require(id);
    }

    @Transactional
    public ManagementReview update(Long id, UpdateManagementReviewRequest request, Long actorId, String actorName,
                                   String ip, String ua) {
        ManagementReview review = require(id);
        checkVersion(review.getVersion(), request.expectedVersion());
        if (review.getMrStatus() == MrStatus.COMPLETED) {
            throw new WorkflowException("A completed management review can no longer be edited");
        }
        if (request.reviewDate() != null) review.setReviewDate(request.reviewDate());
        if (request.participants() != null) review.setParticipants(request.participants());
        if (request.scope() != null) review.setScope(request.scope());
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Management review updated", actorId, actorName, ip, ua);
        return review;
    }

    @Transactional
    public ReviewMetric addMetric(Long id, AddMetricRequest request, Long actorId, String actorName,
                                  String ip, String ua) {
        ManagementReview review = require(id);
        ensureActive(review, actorId, actorName, ip, ua);

        ReviewMetric metric = new ReviewMetric();
        metric.setManagementReviewId(id);
        metric.setMetricName(request.metricName());
        metric.setMetricValue(request.metricValue());
        metric.setPeriod(request.period());
        metric.setTrend(request.trend());
        metric = metricRepository.save(metric);

        audit(id, AuditAction.UPDATE, "metric", null, request.metricName(),
                request.reason() != null ? request.reason() : "QMS metric captured", actorId, actorName, ip, ua);
        return metric;
    }

    @Transactional
    public ReviewAuditResult addAuditResult(Long id, AddAuditResultRequest request, Long actorId, String actorName,
                                            String ip, String ua) {
        ManagementReview review = require(id);
        ensureActive(review, actorId, actorName, ip, ua);

        ReviewAuditResult result = new ReviewAuditResult();
        result.setManagementReviewId(id);
        result.setAuditId(request.auditId());
        result.setCriticalFindings(orZero(request.criticalFindings()));
        result.setMajorFindings(orZero(request.majorFindings()));
        result.setMinorFindings(orZero(request.minorFindings()));
        result = auditResultRepository.save(result);

        audit(id, AuditAction.UPDATE, "audit_result", null, "audit:" + request.auditId(),
                request.reason() != null ? request.reason() : "Audit results linked", actorId, actorName, ip, ua);
        return result;
    }

    @Transactional
    public ReviewProductFeedback addProductFeedback(Long id, AddProductFeedbackRequest request, Long actorId,
                                                    String actorName, String ip, String ua) {
        ManagementReview review = require(id);
        ensureActive(review, actorId, actorName, ip, ua);

        ReviewProductFeedback feedback = new ReviewProductFeedback();
        feedback.setManagementReviewId(id);
        feedback.setComplaintsCount(orZero(request.complaintsCount()));
        feedback.setReturnsCount(orZero(request.returnsCount()));
        feedback.setSeriousAdverseEvents(orZero(request.seriousAdverseEvents()));
        feedback = productFeedbackRepository.save(feedback);

        audit(id, AuditAction.UPDATE, "product_feedback", null, "captured",
                request.reason() != null ? request.reason() : "Product feedback captured", actorId, actorName, ip, ua);
        return feedback;
    }

    @Transactional
    public ReviewActionItem addActionItem(Long id, AddActionItemRequest request, Long actorId, String actorName,
                                          String ip, String ua) {
        ManagementReview review = require(id);
        ensureActive(review, actorId, actorName, ip, ua);

        ReviewActionItem item = new ReviewActionItem();
        item.setManagementReviewId(id);
        item.setActionDescription(request.actionDescription());
        item.setOwnerId(request.ownerId());
        item.setDueDate(request.dueDate());
        item.setStatus(ActionItemStatus.OPEN);
        item = actionItemRepository.save(item);

        audit(id, AuditAction.UPDATE, "action_item", null, "open",
                request.reason() != null ? request.reason() : "Action item assigned", actorId, actorName, ip, ua);
        return item;
    }

    @Transactional
    public ReviewDecision recordDecision(Long id, RecordDecisionRequest request, Long actorId, String actorName,
                                         String ip, String ua) {
        ManagementReview review = require(id);
        ensureActive(review, actorId, actorName, ip, ua);

        ReviewDecision decision = new ReviewDecision();
        decision.setManagementReviewId(id);
        decision.setDecisionDescription(request.decisionDescription());
        decision.setDecisionArea(request.decisionArea());
        decision.setImpact(request.impact());
        decision.setDocumentedBy(actorId);
        decision.setDocumentedDate(Instant.now(clock));
        decision = decisionRepository.save(decision);

        audit(id, AuditAction.UPDATE, "decision", null, request.decisionArea(),
                request.reason() != null ? request.reason() : "Management decision documented",
                actorId, actorName, ip, ua);
        return decision;
    }

    @Transactional
    public ManagementReview approve(Long id, ApproveReviewRequest request, boolean firstSignatureInSession,
                                    Long actorId, String actorName, String ip, String ua) {
        ManagementReview review = require(id);

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(ManagementReviewWorkflow.RECORD_TYPE).recordId(String.valueOf(review.getId()))
                .contentHash(review.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(request.meaningStatement() != null ? request.meaningStatement()
                        : "I approve and finalize this management review, including its documented decisions and action items.")
                .password(request.password())
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(request.totpCode())
                .ipAddress(ip).userAgent(ua)
                .build());

        review.setApprovedDate(Instant.now(clock));
        transition(review, ManagementReviewWorkflow.APPROVE, request.expectedVersion(), request.reason(),
                actorId, actorName, ip, ua);
        return review;
    }

    @Transactional(readOnly = true)
    public List<ReviewActionItem> previousActions(Long id) {
        ManagementReview review = require(id);
        List<Long> earlierReviewIds = repository
                .findByReviewDateLessThanOrderByReviewDateDesc(review.getReviewDate())
                .stream().map(ManagementReview::getId).toList();
        if (earlierReviewIds.isEmpty()) {
            return List.of();
        }
        return actionItemRepository.findByManagementReviewIdIn(earlierReviewIds);
    }

    @Transactional(readOnly = true)
    public ReviewReportResponse generateReport(Long id) {
        ManagementReview review = require(id);
        List<ReviewMetric> metrics = metricRepository.findByManagementReviewId(id);
        List<ReviewAuditResult> auditResults = auditResultRepository.findByManagementReviewId(id);
        List<ReviewProductFeedback> feedback = productFeedbackRepository.findByManagementReviewId(id);
        List<ReviewActionItem> actionItems = actionItemRepository.findByManagementReviewId(id);
        List<ReviewDecision> decisions = decisionRepository.findByManagementReviewId(id);

        int critical = auditResults.stream().mapToInt(r -> orZero(r.getCriticalFindings())).sum();
        int major = auditResults.stream().mapToInt(r -> orZero(r.getMajorFindings())).sum();
        int minor = auditResults.stream().mapToInt(r -> orZero(r.getMinorFindings())).sum();
        int complaints = feedback.stream().mapToInt(f -> orZero(f.getComplaintsCount())).sum();
        int returns = feedback.stream().mapToInt(f -> orZero(f.getReturnsCount())).sum();
        int saes = feedback.stream().mapToInt(f -> orZero(f.getSeriousAdverseEvents())).sum();
        int open = (int) actionItems.stream().filter(a -> a.getStatus() == ActionItemStatus.OPEN).count();
        int completed = (int) actionItems.stream().filter(a -> a.getStatus() == ActionItemStatus.COMPLETED).count();

        return new ReviewReportResponse(review.getId(), review.getReviewNo(), review.getReviewDate(),
                review.getMrStatus().name(), metrics.size(), auditResults.size(),
                critical, major, minor, complaints, returns, saes,
                actionItems.size(), open, completed, decisions.size());
    }

    @Transactional(readOnly = true)
    public List<ReviewMetric> getMetrics(Long id) {
        return metricRepository.findByManagementReviewId(id);
    }

    @Transactional(readOnly = true)
    public List<ReviewAuditResult> getAuditResults(Long id) {
        return auditResultRepository.findByManagementReviewId(id);
    }

    @Transactional(readOnly = true)
    public List<ReviewProductFeedback> getProductFeedback(Long id) {
        return productFeedbackRepository.findByManagementReviewId(id);
    }

    @Transactional(readOnly = true)
    public List<ReviewActionItem> getActionItems(Long id) {
        return actionItemRepository.findByManagementReviewId(id);
    }

    @Transactional(readOnly = true)
    public List<ReviewDecision> getDecisions(Long id) {
        return decisionRepository.findByManagementReviewId(id);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(ManagementReviewWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals ---------------------------------------------------------------------------

    /** Open the review for input on first contribution (SCHEDULED -> IN_PROGRESS); reject once COMPLETED. */
    private void ensureActive(ManagementReview review, Long actorId, String actorName, String ip, String ua) {
        if (review.getMrStatus() == MrStatus.COMPLETED) {
            throw new WorkflowException("Inputs cannot be added to a completed management review");
        }
        if (review.getMrStatus() == MrStatus.SCHEDULED) {
            // Whoever opens the review for input becomes its driver, so a different manager must approve (rule 7).
            review.setSubmittedBy(actorId);
            transition(review, ManagementReviewWorkflow.START, review.getVersion(),
                    "Management review opened for input", actorId, actorName, ip, ua);
        }
    }

    private void transition(ManagementReview review, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(ManagementReviewWorkflow.DEFINITION, review,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(ua)
                        .build());
    }

    private void audit(Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(ManagementReviewWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
    }

    private static int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private ManagementReview require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Management review not found: " + id));
    }
}
