package com.eqms.training;

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
import com.eqms.common.HtmlSanitizer;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.training.dto.AssignUserRequest;
import com.eqms.training.dto.ComplianceStatusResponse;
import com.eqms.training.dto.CreateRuleRequest;
import com.eqms.training.dto.CreateTrainingRequest;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.WorkflowException;

/**
 * Training Management application service. Programs are master data; assignments carry the
 * compliance lifecycle (ASSIGNED → IN_PROGRESS → COMPLETED, or OVERDUE). Completion is recorded with
 * evidence and an immutable completion-audit row. Numbering via {@link SequenceService}; every
 * mutation is audited.
 */
@Service
public class TrainingService {

    private static final String TRAINING_PREFIX = "TRN";

    private final TrainingProgramRepository programRepository;
    private final TrainingAssignmentRepository assignmentRepository;
    private final TrainingAutoRuleRepository ruleRepository;
    private final TrainingSessionRepository sessionRepository;
    private final TrainingCompletionAuditRepository completionAuditRepository;
    private final SequenceService sequenceService;
    private final AuditService auditService;
    private final Clock clock;

    public TrainingService(TrainingProgramRepository programRepository,
                           TrainingAssignmentRepository assignmentRepository,
                           TrainingAutoRuleRepository ruleRepository,
                           TrainingSessionRepository sessionRepository,
                           TrainingCompletionAuditRepository completionAuditRepository,
                           SequenceService sequenceService, AuditService auditService, Clock utcClock) {
        this.programRepository = programRepository;
        this.assignmentRepository = assignmentRepository;
        this.ruleRepository = ruleRepository;
        this.sessionRepository = sessionRepository;
        this.completionAuditRepository = completionAuditRepository;
        this.sequenceService = sequenceService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public TrainingProgram create(CreateTrainingRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(TRAINING_PREFIX, year);

        TrainingProgram program = new TrainingProgram();
        program.setTrainingCode(code);
        program.setTitle(request.title());
        program.setContent(HtmlSanitizer.sanitize(request.content()));
        program.setIntendedAudience(request.intendedAudience());
        program.setRequiredFrequency(request.requiredFrequency());
        program.setNumbering(blankToNull(request.numbering()));
        program.setTrainingType(blankToNull(request.trainingType()));
        program.setOccurrence(blankToNull(request.occurrence()));
        program.setStartAt(request.startAt());
        program.setEndAt(request.endAt());
        program.setCompletionTargetAt(request.completionTargetAt());
        program.setReleaseMode(blankToNull(request.releaseMode()));
        program.setReleaseAt(request.releaseAt());
        program.setMainTrainerName(blankToNull(request.mainTrainerName()));
        program.setAdditionalTrainers(joinLines(request.additionalTrainers()));
        program.setInternalDocuments(joinLines(request.internalDocuments()));
        program.setLearningObjectives(HtmlSanitizer.sanitize(request.learningObjectives()));
        program.setAssessmentCriteria(HtmlSanitizer.sanitize(request.assessmentCriteria()));
        program.setActive(true);
        program = programRepository.save(program);

        if (request.sessions() != null) {
            for (CreateTrainingRequest.TrainingSessionRequest item : request.sessions()) {
                if (item.startAt() == null && item.endAt() == null) continue;
                TrainingSession session = new TrainingSession();
                session.setTrainingProgramId(program.getId());
                session.setSessionIndex(item.sessionIndex());
                session.setStartAt(item.startAt());
                session.setEndAt(item.endAt());
                sessionRepository.save(session);
            }
        }

        audit("TrainingProgram", program.getId(), AuditAction.CREATE, null, code,
                "Training program created", actorId, actorName, ip, ua);
        return program;
    }

    @Transactional(readOnly = true)
    public Page<TrainingProgram> list(TrainingAudience audience, Pageable pageable) {
        return audience == null
                ? programRepository.findAll(pageable)
                : programRepository.findByIntendedAudience(audience, pageable);
    }

    @Transactional(readOnly = true)
    public TrainingProgram get(Long id) {
        return requireProgram(id);
    }

    @Transactional(readOnly = true)
    public List<TrainingSession> sessions(Long programId) {
        requireProgram(programId);
        return sessionRepository.findByTrainingProgramIdOrderBySessionIndexAsc(programId);
    }

    @Transactional(readOnly = true)
    public List<TrainingAssignment> assignments(Long programId) {
        requireProgram(programId);
        return assignmentRepository.findByTrainingProgramId(programId);
    }

    @Transactional(readOnly = true)
    public List<TrainingAutoRule> rules(Long programId) {
        requireProgram(programId);
        return ruleRepository.findByTrainingProgramId(programId);
    }

    /** Assign the program to a user; due date defaults to assignment date + the program's frequency. */
    @Transactional
    public TrainingAssignment assignUser(Long programId, AssignUserRequest request,
                                         Long actorId, String actorName, String ip, String ua) {
        TrainingProgram program = requireProgram(programId);
        if (assignmentRepository.existsByTrainingProgramIdAndUserId(programId, request.userId())) {
            throw new WorkflowException("User " + request.userId() + " is already assigned to this training");
        }
        Instant now = Instant.now(clock);
        Instant dueDate = request.dueDate();
        if (dueDate == null) {
            int days = program.getRequiredFrequency().days();
            dueDate = days > 0 ? now.plus(days, ChronoUnit.DAYS) : now.plus(30, ChronoUnit.DAYS);
        }
        TrainingAssignment assignment = new TrainingAssignment();
        assignment.setTrainingProgramId(programId);
        assignment.setUserId(request.userId());
        assignment.setAssignedDate(now);
        assignment.setDueDate(dueDate);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignment = assignmentRepository.save(assignment);

        audit("TrainingAssignment", assignment.getId(), AuditAction.CREATE, null,
                "user " + request.userId() + " -> " + program.getTrainingCode(),
                "Training assigned", actorId, actorName, ip, ua);
        return assignment;
    }

    /** Record completion of an assignment, with evidence + an immutable completion-audit row. */
    @Transactional
    public TrainingAssignment recordCompletion(Long assignmentId, int expectedVersion, String evidence, String reason,
                                               Long actorId, String actorName, String ip, String ua) {
        TrainingAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found: " + assignmentId));
        checkVersion(assignment.getVersion(), expectedVersion);
        if (assignment.getStatus() == AssignmentStatus.COMPLETED) {
            throw new WorkflowException("Assignment is already completed");
        }
        Instant now = Instant.now(clock);
        assignment.setStatus(AssignmentStatus.COMPLETED);
        assignment.setCompletionDate(now);
        assignment.setCompletionEvidence(evidence);

        TrainingCompletionAudit completion = new TrainingCompletionAudit();
        completion.setTrainingAssignmentId(assignmentId);
        completion.setUserId(assignment.getUserId());
        completion.setCompletionDate(now);
        completion.setCompletedBy(actorId.equals(assignment.getUserId()) ? "self" : "trainer");
        completion.setEvidenceFile(evidence);
        completionAuditRepository.save(completion);

        audit("TrainingAssignment", assignmentId, AuditAction.UPDATE, "status", "ASSIGNED", "COMPLETED",
                reason != null ? reason : "Training completed", actorId, actorName, ip, ua);
        return assignment;
    }

    @Transactional
    public TrainingAutoRule createRule(Long programId, CreateRuleRequest request,
                                       Long actorId, String actorName, String ip, String ua) {
        requireProgram(programId);
        TrainingAutoRule rule = new TrainingAutoRule();
        rule.setTrainingProgramId(programId);
        rule.setTriggerEvent(request.triggerEvent());
        rule.setTargetAudience(request.targetAudience());
        rule.setDueWithinDays(request.dueWithinDays());
        rule = ruleRepository.save(rule);

        audit("TrainingProgram", programId, AuditAction.UPDATE, "auto_rule", null,
                "Auto-assignment rule on '" + request.triggerEvent() + "'",
                "Training auto-rule created", actorId, actorName, ip, ua);
        return rule;
    }

    /** Open assignments past their due date (status reflected as OVERDUE in the view). */
    @Transactional(readOnly = true)
    public List<TrainingAssignment> overdue() {
        return assignmentRepository.findOpenDueBy(Instant.now(clock));
    }

    @Transactional(readOnly = true)
    public List<TrainingAssignment> dueSoon() {
        Instant now = Instant.now(clock);
        return assignmentRepository.findOpenDueBetween(now, now.plus(7, ChronoUnit.DAYS));
    }

    @Transactional(readOnly = true)
    public ComplianceStatusResponse complianceStatus() {
        long assigned = assignmentRepository.countByStatus(AssignmentStatus.ASSIGNED);
        long inProgress = assignmentRepository.countByStatus(AssignmentStatus.IN_PROGRESS);
        long completed = assignmentRepository.countByStatus(AssignmentStatus.COMPLETED);
        long overdue = assignmentRepository.findOpenDueBy(Instant.now(clock)).size();
        long total = assigned + inProgress + completed;
        double rate = total == 0 ? 0.0 : (completed * 100.0) / total;
        return new ComplianceStatusResponse(assigned, inProgress, completed, overdue,
                Math.round(rate * 100.0) / 100.0);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long programId) {
        requireProgram(programId);
        return auditService.trailFor("TrainingProgram", String.valueOf(programId));
    }

    // --- internals -----------------------------------------------------------------------------

    private void audit(String recordType, Long id, AuditAction action, String field, String newValue,
                       String reason, Long actorId, String actorName, String ip, String ua) {
        audit(recordType, id, action, field, null, newValue, reason, actorId, actorName, ip, ua);
    }

    private void audit(String recordType, Long id, AuditAction action, String field, String oldValue,
                       String newValue, String reason, Long actorId, String actorName, String ip, String ua) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(recordType).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(ua)
                .build());
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private TrainingProgram requireProgram(Long id) {
        return programRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found: " + id));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String joinLines(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        String joined = String.join("\n", values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .toList());
        return joined.isBlank() ? null : joined;
    }
}
