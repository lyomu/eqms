package com.eqms.training;

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
import com.eqms.common.dto.AuditEntryResponse;
import com.eqms.common.dto.PageResponse;
import com.eqms.notifications.NotificationDispatcher;
import com.eqms.notifications.NotificationType;
import com.eqms.training.dto.AssignUserRequest;
import com.eqms.training.dto.AssignUsersRequest;
import com.eqms.training.dto.AssignmentResponse;
import com.eqms.training.dto.ComplianceStatusResponse;
import com.eqms.training.dto.CreateAutoRuleRequest;
import com.eqms.training.dto.CreateRuleRequest;
import com.eqms.training.dto.CreateTrainingRequest;
import com.eqms.training.dto.RecordCompletionRequest;
import com.eqms.training.dto.RuleResponse;
import com.eqms.training.dto.TrainingResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** Training Management REST API. Mutating endpoints are backend-guarded by TRAINING_MANAGE. */
@RestController
@RequestMapping("/api/training")
public class TrainingController {

    private final TrainingService service;
    private final NotificationDispatcher notifications;

    public TrainingController(TrainingService service, NotificationDispatcher notifications) {
        this.service = service;
        this.notifications = notifications;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<TrainingResponse> list(@RequestParam(required = false) TrainingAudience audience,
                                               Pageable pageable) {
        Page<TrainingProgram> page = service.list(audience, pageable);
        return PageResponse.from(page, page.getContent().stream().map(TrainingResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('TRAINING_MANAGE')")
    public ResponseEntity<TrainingResponse> create(@Valid @RequestBody CreateTrainingRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        TrainingProgram program = service.create(request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(TrainingResponse.from(program));
    }

    @GetMapping("/due-soon")
    @PreAuthorize("isAuthenticated()")
    public List<AssignmentResponse> dueSoon() {
        return service.dueSoon().stream().map(AssignmentResponse::from).toList();
    }

    @GetMapping("/overdue")
    @PreAuthorize("isAuthenticated()")
    public List<AssignmentResponse> overdue() {
        return service.overdue().stream().map(AssignmentResponse::from).toList();
    }

    @GetMapping("/compliance-status")
    @PreAuthorize("isAuthenticated()")
    public ComplianceStatusResponse complianceStatus() {
        return service.complianceStatus();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TrainingResponse get(@PathVariable Long id) {
        return TrainingResponse.from(service.get(id));
    }

    @GetMapping("/{id}/assignments")
    @PreAuthorize("isAuthenticated()")
    public List<AssignmentResponse> assignments(@PathVariable Long id) {
        return service.assignments(id).stream().map(AssignmentResponse::from).toList();
    }

    @PostMapping("/{id}/assign-user")
    @PreAuthorize("hasAuthority('TRAINING_MANAGE')")
    public ResponseEntity<AssignmentResponse> assignUser(@PathVariable Long id,
                                                         @Valid @RequestBody AssignUserRequest request,
                                                         @AuthenticationPrincipal UserPrincipal p,
                                                         HttpServletRequest http) {
        TrainingAssignment a = service.assignUser(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        notifications.dispatchToUser(a.getUserId(), NotificationType.TRAINING_ASSIGNED,
                "Training assignment",
                "You have been assigned a training program. Please complete it by the due date.",
                "TrainingProgram", String.valueOf(id));
        return ResponseEntity.status(HttpStatus.CREATED).body(AssignmentResponse.from(a));
    }

    @PostMapping("/{id}/assign-users")
    @PreAuthorize("hasAuthority('TRAINING_MANAGE')")
    public ResponseEntity<List<AssignmentResponse>> assignUsers(@PathVariable Long id,
                                                                @Valid @RequestBody AssignUsersRequest request,
                                                                @AuthenticationPrincipal UserPrincipal p,
                                                                HttpServletRequest http) {
        List<AssignmentResponse> assignments = request.userIds().stream()
                .map(userId -> service.assignUser(id, new AssignUserRequest(userId, request.dueDate()),
                        p.getId(), p.getFullName(), ip(http), ua(http)))
                .peek(a -> notifications.dispatchToUser(a.getUserId(), NotificationType.TRAINING_ASSIGNED,
                        "Training assignment",
                        "You have been assigned a training program. Please complete it by the due date.",
                        "TrainingProgram", String.valueOf(id)))
                .map(AssignmentResponse::from)
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(assignments);
    }

    @PostMapping("/{id}/record-completion")
    @PreAuthorize("isAuthenticated()")
    public AssignmentResponse recordCompletion(@PathVariable Long id,
                                               @Valid @RequestBody RecordCompletionRequest request,
                                               @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        return AssignmentResponse.from(service.recordCompletion(request.assignmentId(), request.expectedVersion(),
                request.completionEvidence(), request.reason(), p.getId(), p.getFullName(), ip(http), ua(http)));
    }

    @PostMapping("/{id}/create-rule")
    @PreAuthorize("hasAuthority('TRAINING_MANAGE')")
    public ResponseEntity<RuleResponse> createRule(@PathVariable Long id, @Valid @RequestBody CreateRuleRequest request,
                                                   @AuthenticationPrincipal UserPrincipal p, HttpServletRequest http) {
        TrainingAutoRule rule = service.createRule(id, request, p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(RuleResponse.from(rule));
    }

    @PostMapping("/{id}/create-auto-rule")
    @PreAuthorize("hasAuthority('TRAINING_MANAGE')")
    public ResponseEntity<RuleResponse> createAutoRule(@PathVariable Long id,
                                                       @Valid @RequestBody CreateAutoRuleRequest request,
                                                       @AuthenticationPrincipal UserPrincipal p,
                                                       HttpServletRequest http) {
        TrainingAudience audience = TrainingAudience.valueOf(request.targetAudience().get(0));
        TrainingAutoRule rule = service.createRule(id,
                new CreateRuleRequest(request.triggerEvent(), audience, request.daysUntilDue()),
                p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(RuleResponse.from(rule));
    }

    @GetMapping("/{id}/rules")
    @PreAuthorize("isAuthenticated()")
    public List<RuleResponse> rules(@PathVariable Long id) {
        return service.rules(id).stream().map(RuleResponse::from).toList();
    }

    @GetMapping("/{id}/audit-trail")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<AuditEntryResponse> auditTrail(@PathVariable Long id) {
        return service.auditTrail(id).stream().map(AuditEntryResponse::from).toList();
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
