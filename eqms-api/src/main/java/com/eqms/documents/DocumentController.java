package com.eqms.documents;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.documents.dto.ActionRequest;
import com.eqms.documents.dto.ApproveRequest;
import com.eqms.documents.dto.AssignReadRequest;
import com.eqms.documents.dto.AuditEntryResponse;
import com.eqms.documents.dto.CreateDocumentRequest;
import com.eqms.documents.dto.DocumentResponse;
import com.eqms.documents.dto.PageResponse;
import com.eqms.documents.dto.ReadAssignmentResponse;
import com.eqms.notifications.NotificationDispatcher;
import com.eqms.notifications.NotificationType;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Document Control REST API. Every mutating endpoint carries a backend {@code @PreAuthorize} guard
 * (CLAUDE.md rule 8); the actual transitions/signatures are enforced again in the service layer via
 * WorkflowService/SignatureService.
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    /** Session flag tracking whether a signature has already been applied this session. */
    private static final String SIGNED_IN_SESSION = "EQMS_SIGNED_IN_SESSION";

    private final DocumentService documentService;
    private final NotificationDispatcher notifications;

    public DocumentController(DocumentService documentService, NotificationDispatcher notifications) {
        this.documentService = documentService;
        this.notifications = notifications;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<DocumentResponse> list(@RequestParam(required = false) DocumentStatus status,
                                               Pageable pageable) {
        Page<Document> page = documentService.list(status, pageable);
        List<DocumentResponse> content = page.getContent().stream().map(DocumentResponse::from).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public ResponseEntity<DocumentResponse> create(@Valid @RequestBody CreateDocumentRequest request,
                                                    @AuthenticationPrincipal UserPrincipal principal,
                                                    HttpServletRequest http) {
        Document document = documentService.create(request.title(), request.type(), request.content(),
                request.reviewPeriodMonths(), principal.getId(), principal.getFullName(),
                clientIp(http), userAgent(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.from(document));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public DocumentResponse get(@PathVariable Long id) {
        return DocumentResponse.from(documentService.get(id));
    }

    @PostMapping("/{id}/submit-for-review")
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public DocumentResponse submitForReview(@PathVariable Long id, @Valid @RequestBody ActionRequest request,
                                            @AuthenticationPrincipal UserPrincipal principal,
                                            HttpServletRequest http) {
        Document document = documentService.submitForReview(id, request.expectedVersion(),
                request.reason(), principal.getId(), principal.getFullName(), clientIp(http), userAgent(http));
        // Notify reviewers (async, after the transactional action succeeded). The submitter is excluded.
        notifications.dispatchToAuthority("DOCUMENT_REVIEW", principal.getId(),
                NotificationType.DOCUMENT_SUBMITTED_FOR_REVIEW,
                "Document " + document.getDocumentNumber() + " submitted for review",
                "A document is awaiting your review.",
                "Document", String.valueOf(document.getId()));
        return DocumentResponse.from(document);
    }

    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAuthority('DOCUMENT_REVIEW')")
    public DocumentResponse submitForApproval(@PathVariable Long id, @Valid @RequestBody ActionRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal,
                                              HttpServletRequest http) {
        Document document = documentService.submitForApproval(id, request.expectedVersion(),
                request.reason(), principal.getId(), principal.getFullName(), clientIp(http), userAgent(http));
        notifications.dispatchToAuthority("DOCUMENT_APPROVE", principal.getId(),
                NotificationType.DOCUMENT_PENDING_APPROVAL,
                "Document " + document.getDocumentNumber() + " pending approval",
                "A document is awaiting your approval.",
                "Document", String.valueOf(document.getId()));
        return DocumentResponse.from(document);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('DOCUMENT_APPROVE')")
    public DocumentResponse approve(@PathVariable Long id, @Valid @RequestBody ApproveRequest request,
                                    @AuthenticationPrincipal UserPrincipal principal,
                                    HttpServletRequest http) {
        HttpSession session = http.getSession();
        boolean firstSignatureInSession = session.getAttribute(SIGNED_IN_SESSION) == null;
        DocumentResponse response = DocumentResponse.from(documentService.approve(id, request.expectedVersion(),
                request.reason(), request.password(), request.totpCode(), firstSignatureInSession,
                request.meaningStatement(), principal.getId(), principal.getFullName(),
                clientIp(http), userAgent(http)));
        session.setAttribute(SIGNED_IN_SESSION, Boolean.TRUE); // only after a successful signature
        return response;
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('DOCUMENT_APPROVE')")
    public DocumentResponse reject(@PathVariable Long id, @Valid @RequestBody ActionRequest request,
                                   @AuthenticationPrincipal UserPrincipal principal,
                                   HttpServletRequest http) {
        return DocumentResponse.from(documentService.reject(id, request.expectedVersion(),
                request.reason(), principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/make-effective")
    @PreAuthorize("hasAuthority('DOCUMENT_APPROVE')")
    public DocumentResponse makeEffective(@PathVariable Long id, @Valid @RequestBody ActionRequest request,
                                          @AuthenticationPrincipal UserPrincipal principal,
                                          HttpServletRequest http) {
        return DocumentResponse.from(documentService.makeEffective(id, request.expectedVersion(),
                request.reason(), principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @PostMapping("/{id}/obsolete")
    @PreAuthorize("hasAuthority('DOCUMENT_OBSOLETE')")
    public DocumentResponse obsolete(@PathVariable Long id, @Valid @RequestBody ActionRequest request,
                                     @AuthenticationPrincipal UserPrincipal principal,
                                     HttpServletRequest http) {
        return DocumentResponse.from(documentService.obsolete(id, request.expectedVersion(),
                request.reason(), principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return documentService.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    @GetMapping("/due-for-review")
    @PreAuthorize("isAuthenticated()")
    public List<DocumentResponse> dueForReview() {
        return documentService.dueForReview().stream().map(DocumentResponse::from).toList();
    }

    @PostMapping("/{id}/read-assignments")
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public ResponseEntity<ReadAssignmentResponse> assignRead(@PathVariable Long id,
                                                             @Valid @RequestBody AssignReadRequest request,
                                                             @AuthenticationPrincipal UserPrincipal principal,
                                                             HttpServletRequest http) {
        ReadAssignmentResponse response = ReadAssignmentResponse.from(documentService.assignRead(id,
                request.assignedTo(), principal.getId(), principal.getFullName(),
                clientIp(http), userAgent(http)));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/read-assignments/{assignmentId}/acknowledge")
    @PreAuthorize("isAuthenticated()")
    public ReadAssignmentResponse acknowledgeRead(@PathVariable Long assignmentId,
                                                  @AuthenticationPrincipal UserPrincipal principal,
                                                  HttpServletRequest http) {
        return ReadAssignmentResponse.from(documentService.acknowledgeRead(assignmentId,
                principal.getId(), principal.getFullName(), clientIp(http), userAgent(http)));
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
