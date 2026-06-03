package com.eqms.documents;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowService;

/**
 * Document Control application service. All status changes go through {@link WorkflowService};
 * approval signing goes through {@link SignatureService}; numbers come from {@link SequenceService}.
 * This class contains no workflow or signature logic of its own.
 */
@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentReadAssignmentRepository readAssignmentRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentReadAssignmentRepository readAssignmentRepository,
                           SequenceService sequenceService, WorkflowService workflowService,
                           SignatureService signatureService, AuditService auditService, Clock utcClock) {
        this.documentRepository = documentRepository;
        this.readAssignmentRepository = readAssignmentRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Document create(String title, DocumentType type, String content, Integer reviewPeriodMonths,
                           Long actorId, String actorName, String ip, String userAgent) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String number = sequenceService.next(type.prefix(), year);

        Document document = new Document();
        document.setDocumentNumber(number);
        document.setTitle(title);
        document.setDocumentType(type);
        document.setContent(content);
        document.setReviewPeriodMonths(reviewPeriodMonths);
        document.setDocumentStatus(DocumentStatus.DRAFT);
        document.setMajorVersion(1);
        document = documentRepository.save(document);

        auditService.record(AuditEntryRequest.builder()
                .recordType(DocumentWorkflow.RECORD_TYPE).recordId(String.valueOf(document.getId()))
                .action(AuditAction.CREATE)
                .newValue(number)
                .reasonForChange("Document created")
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(userAgent)
                .build());
        return document;
    }

    @Transactional(readOnly = true)
    public Page<Document> list(DocumentStatus status, Pageable pageable) {
        return status == null
                ? documentRepository.findAll(pageable)
                : documentRepository.findByDocumentStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Document get(Long id) {
        return require(id);
    }

    @Transactional
    public Document submitForReview(Long id, int expectedVersion, String reason,
                                    Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);
        transition(document, DocumentWorkflow.SUBMIT_FOR_REVIEW, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    @Transactional
    public Document submitForApproval(Long id, int expectedVersion, String reason,
                                      Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);
        document.setSubmittedBy(actorId); // the submitter cannot later approve (rule 7)
        transition(document, DocumentWorkflow.SUBMIT_FOR_APPROVAL, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    /**
     * Approve a document: apply the Part 11 APPROVED signature (re-auth), then transition. Both run
     * in one transaction — if the no-self-approval or version check fails, the signature is rolled back.
     */
    @Transactional
    public Document approve(Long id, int expectedVersion, String reason, String password, String totpCode,
                            boolean firstSignatureInSession, String meaningStatement,
                            Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);

        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(DocumentWorkflow.RECORD_TYPE).recordId(String.valueOf(document.getId()))
                .contentHash(document.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I approve this document and confirm it is ready for release.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(userAgent)
                .build());

        transition(document, DocumentWorkflow.APPROVE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    @Transactional
    public Document reject(Long id, int expectedVersion, String reason,
                           Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);
        transition(document, DocumentWorkflow.REJECT, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    @Transactional
    public Document makeEffective(Long id, int expectedVersion, String reason,
                                  Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);
        Instant now = Instant.now(clock);
        document.setEffectiveDate(now);
        if (document.getReviewPeriodMonths() != null && document.getReviewPeriodMonths() > 0) {
            document.setNextReviewDate(now.plus(30L * document.getReviewPeriodMonths(), ChronoUnit.DAYS));
        }
        transition(document, DocumentWorkflow.MAKE_EFFECTIVE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    @Transactional
    public Document obsolete(Long id, int expectedVersion, String reason,
                             Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(id);
        transition(document, DocumentWorkflow.OBSOLETE, expectedVersion, reason, actorId, actorName, ip, userAgent);
        return document;
    }

    @Transactional
    public DocumentReadAssignment assignRead(Long documentId, Long assignedTo,
                                             Long actorId, String actorName, String ip, String userAgent) {
        Document document = require(documentId);
        DocumentReadAssignment assignment = new DocumentReadAssignment();
        assignment.setDocumentId(document.getId());
        assignment.setAssignedTo(assignedTo);
        assignment.setAssignedAt(Instant.now(clock));
        assignment.setAssignedBy(actorId);
        assignment = readAssignmentRepository.save(assignment);

        auditService.record(AuditEntryRequest.builder()
                .recordType("DocumentReadAssignment").recordId(String.valueOf(assignment.getId()))
                .action(AuditAction.CREATE)
                .newValue("Assigned to user " + assignedTo + " for document " + document.getDocumentNumber())
                .reasonForChange("Read-and-understood assignment created")
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(userAgent)
                .build());
        return assignment;
    }

    @Transactional
    public DocumentReadAssignment acknowledgeRead(Long assignmentId, Long actorId, String actorName,
                                                  String ip, String userAgent) {
        DocumentReadAssignment assignment = readAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Read assignment not found: " + assignmentId));
        assignment.setAcknowledgedAt(Instant.now(clock));

        auditService.record(AuditEntryRequest.builder()
                .recordType("DocumentReadAssignment").recordId(String.valueOf(assignment.getId()))
                .action(AuditAction.UPDATE)
                .fieldName("acknowledged_at").newValue("acknowledged")
                .reasonForChange("Document read and understood acknowledged")
                .userId(actorId).userFullName(actorName)
                .ipAddress(ip).userAgent(userAgent)
                .build());
        return assignment;
    }

    @Transactional(readOnly = true)
    public List<Document> dueForReview() {
        return documentRepository.findDueForReview(Instant.now(clock));
    }

    /** Read-only audit-trail view for a document (compliance rule 1 — read access for viewers). */
    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(DocumentWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(Document document, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(DocumentWorkflow.DEFINITION, document,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(userAgent)
                        .build());
    }

    private Document require(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + id));
    }
}
