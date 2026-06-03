package com.eqms.workflows;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.attachments.AttachmentRepository;
import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.shared.constants.AuditAction;

/**
 * The single entry point for every regulated status transition (CLAUDE.md architecture principle:
 * "No module mutates status directly"). For each transition it enforces, in one transaction:
 *
 * <ol>
 *   <li>the transition is allowed from the current status;</li>
 *   <li>optimistic-lock version check (rule 5);</li>
 *   <li>permission — the actor holds the required authority (rule 8);</li>
 *   <li>required fields present (module-supplied precondition);</li>
 *   <li>required attachment present;</li>
 *   <li>no self-approval (rule 7);</li>
 *   <li>required electronic signature applied and still valid (rule 4);</li>
 * </ol>
 * then applies the new status and writes the audit entry in the <em>same</em> {@code @Transactional}
 * block (rule 1). Any failed check throws and rolls the whole thing back.
 */
@Service
public class WorkflowService {

    private final AuditService auditService;
    private final AttachmentRepository attachmentRepository;
    private final com.eqms.signatures.SignatureService signatureService;

    public WorkflowService(AuditService auditService, AttachmentRepository attachmentRepository,
                           com.eqms.signatures.SignatureService signatureService) {
        this.auditService = auditService;
        this.attachmentRepository = attachmentRepository;
        this.signatureService = signatureService;
    }

    @Transactional
    public void transition(WorkflowDefinition definition, WorkflowAware entity, TransitionRequest request) {
        WorkflowTransition transition = definition.find(entity.getStatus(), request.action())
                .orElseThrow(() -> new WorkflowException("No transition '" + request.action()
                        + "' from status '" + entity.getStatus() + "' for " + definition.recordType()));

        // (2) optimistic-lock version check — rule 5
        if (request.expectedVersion() != entity.getVersion()) {
            throw new StaleVersionException("Stale version for " + entity.getRecordType() + " "
                    + entity.getId() + ": record is at v" + entity.getVersion()
                    + " but the request was made against v" + request.expectedVersion());
        }

        // (3) permission — rule 8
        if (transition.requiredAuthority() != null && !hasAuthority(transition.requiredAuthority())) {
            throw new AccessDeniedException("Missing authority '" + transition.requiredAuthority()
                    + "' required for action " + transition.action());
        }

        // (4) required fields — module-supplied precondition
        if (transition.precondition() != null && !transition.precondition().test(entity)) {
            throw new WorkflowException(transition.preconditionMessage() != null
                    ? transition.preconditionMessage()
                    : "Required fields are missing for action " + transition.action());
        }

        // (5) required attachment
        if (transition.requiresAttachment()
                && attachmentRepository.findByRecordTypeAndRecordId(
                        entity.getRecordType(), String.valueOf(entity.getId())).isEmpty()) {
            throw new WorkflowException("At least one attachment is required for action " + transition.action());
        }

        // (6) no self-approval — rule 7
        if (transition.approval() && isActorTheOwner(entity, request.actingUserId())) {
            throw new SelfApprovalException("A user cannot approve their own record ("
                    + entity.getRecordType() + " " + entity.getId() + ")");
        }

        // (7) required signature — rule 4
        if (transition.requiredSignature() != null) {
            boolean valid = signatureService.hasValidSignature(
                    entity.getRecordType(), String.valueOf(entity.getId()),
                    entity.workflowContentHash(), transition.requiredSignature(), request.actingUserId());
            if (!valid) {
                throw new WorkflowException("A valid '" + transition.requiredSignature().label()
                        + "' signature is required for action " + transition.action());
            }
        }

        // Apply + audit in the same transaction — rule 1
        String fromStatus = entity.getStatus();
        entity.setStatus(transition.toStatus());
        auditService.record(AuditEntryRequest.builder()
                .recordType(entity.getRecordType()).recordId(String.valueOf(entity.getId()))
                .action(AuditAction.STATUS_CHANGE)
                .fieldName("status").oldValue(fromStatus).newValue(transition.toStatus())
                .reasonForChange(request.reason())
                .userId(request.actingUserId()).userFullName(request.actingUserFullName())
                .ipAddress(request.ipAddress()).userAgent(request.userAgent())
                .build());
    }

    private boolean isActorTheOwner(WorkflowAware entity, Long actingUserId) {
        if (actingUserId == null) {
            return false;
        }
        return actingUserId.equals(entity.getCreatedBy()) || actingUserId.equals(entity.getSubmittedBy());
    }

    private boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(granted -> granted.getAuthority().equals(authority));
    }
}
