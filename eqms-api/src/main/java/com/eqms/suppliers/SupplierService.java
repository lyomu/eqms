package com.eqms.suppliers;

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
import com.eqms.admin.settings.OrganizationSettingsPolicyService;
import com.eqms.capa.Capa;
import com.eqms.capa.CapaService;
import com.eqms.capa.CapaSource;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.suppliers.dto.CreateCapaFromFindingRequest;
import com.eqms.suppliers.dto.CreateSupplierRequest;
import com.eqms.suppliers.dto.IssueFindingRequest;
import com.eqms.suppliers.dto.RecordAuditRequest;
import com.eqms.suppliers.dto.RecordPerformanceRequest;
import com.eqms.suppliers.dto.UpdateSupplierRequest;
import com.eqms.suppliers.dto.UploadCertificateRequest;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

/**
 * Supplier Quality application service. Qualification status goes through {@link WorkflowService}
 * (qualify requires an APPROVED signature and blocks self-approval); certifications, performance,
 * audits/qualifications, and findings are append-only child records; a finding can spawn a CAPA.
 */
@Service
public class SupplierService {

    private static final String SUPPLIER_PREFIX = "SUP";

    private final SupplierRepository repository;
    private final SupplierQualificationRepository qualificationRepository;
    private final SupplierCertificationRepository certificationRepository;
    private final SupplierPerformanceRepository performanceRepository;
    private final SupplierFindingRepository findingRepository;
    private final SupplierCapaLinkRepository capaLinkRepository;
    private final CapaService capaService;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final OrganizationSettingsPolicyService settingsPolicy;
    private final Clock clock;

    public SupplierService(SupplierRepository repository,
                           SupplierQualificationRepository qualificationRepository,
                           SupplierCertificationRepository certificationRepository,
                           SupplierPerformanceRepository performanceRepository,
                           SupplierFindingRepository findingRepository,
                           SupplierCapaLinkRepository capaLinkRepository, CapaService capaService,
                           SequenceService sequenceService, WorkflowService workflowService,
                           SignatureService signatureService, AuditService auditService,
                           OrganizationSettingsPolicyService settingsPolicy, Clock utcClock) {
        this.repository = repository;
        this.qualificationRepository = qualificationRepository;
        this.certificationRepository = certificationRepository;
        this.performanceRepository = performanceRepository;
        this.findingRepository = findingRepository;
        this.capaLinkRepository = capaLinkRepository;
        this.capaService = capaService;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.settingsPolicy = settingsPolicy;
        this.clock = utcClock;
    }

    @Transactional
    public Supplier create(CreateSupplierRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(SUPPLIER_PREFIX, year);

        Supplier supplier = new Supplier();
        supplier.setSupplierCode(code);
        supplier.setSupplierName(request.supplierName());
        supplier.setSupplierType(request.supplierType());
        supplier.setContactPerson(request.contactPerson());
        supplier.setEmail(request.email());
        supplier.setPhone(request.phone());
        supplier.setLocation(request.location());
        supplier.setOwnerId(actorId);
        supplier.setSupplierStatus(SupplierStatus.UNAPPROVED);
        supplier = repository.save(supplier);

        audit(supplier.getId(), AuditAction.CREATE, null, null, code, "Supplier created",
                actorId, actorName, ip, ua);
        return supplier;
    }

    @Transactional(readOnly = true)
    public Page<Supplier> list(SupplierStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable) : repository.findBySupplierStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Supplier get(Long id) {
        return require(id);
    }

    @Transactional(readOnly = true)
    public List<SupplierCertification> certifications(Long id) {
        require(id);
        return certificationRepository.findBySupplierIdOrderByExpiryDateAsc(id);
    }

    @Transactional(readOnly = true)
    public List<SupplierPerformance> performanceHistory(Long id) {
        require(id);
        return performanceRepository.findBySupplierIdOrderByAssessmentPeriodEndDesc(id);
    }

    @Transactional(readOnly = true)
    public List<SupplierQualification> auditHistory(Long id) {
        require(id);
        return qualificationRepository.findBySupplierIdOrderByAssessmentDateDesc(id);
    }

    @Transactional(readOnly = true)
    public List<SupplierFinding> findings(Long id) {
        require(id);
        return findingRepository.findBySupplierIdOrderByFindingDateDesc(id);
    }

    @Transactional
    public Supplier update(Long id, UpdateSupplierRequest request, Long actorId, String actorName, String ip, String ua) {
        Supplier supplier = require(id);
        checkVersion(supplier.getVersion(), request.expectedVersion());
        if (request.supplierName() != null) {
            supplier.setSupplierName(request.supplierName());
        }
        if (request.contactPerson() != null) {
            supplier.setContactPerson(request.contactPerson());
        }
        if (request.email() != null) {
            supplier.setEmail(request.email());
        }
        if (request.phone() != null) {
            supplier.setPhone(request.phone());
        }
        if (request.location() != null) {
            supplier.setLocation(request.location());
        }
        audit(id, AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Supplier details updated", actorId, actorName, ip, ua);
        return supplier;
    }

    /** Qualify the supplier: record the qualification assessment and apply the sign-off signature. */
    @Transactional
    public Supplier qualify(Long id, int v, String assessmentMethod, String notes, String reason,
                            String password, String totpCode, boolean firstSignatureInSession,
                            String meaningStatement, Long actorId, String actorName, String ip, String ua) {
        Supplier supplier = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(SupplierWorkflow.RECORD_TYPE).recordId(String.valueOf(supplier.getId()))
                .contentHash(supplier.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I qualify this supplier for use.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());

        SupplierQualification qualification = new SupplierQualification();
        qualification.setSupplierId(id);
        qualification.setAssessmentMethod(assessmentMethod);
        qualification.setAssessmentDate(Instant.now(clock));
        qualification.setAssessor(actorName);
        qualification.setApprovalStatus("QUALIFIED");
        qualification.setNotes(notes);
        qualificationRepository.save(qualification);

        supplier.setQualificationDate(Instant.now(clock));
        transition(supplier, SupplierWorkflow.QUALIFY, v, reason, actorId, actorName, ip, ua);
        return supplier;
    }

    @Transactional
    public Supplier makeConditional(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Supplier supplier = require(id);
        if (!settingsPolicy.enabled("supplier", "conditionalApprovalAllowed", true)) {
            throw new WorkflowException("Conditional supplier approval is disabled by organization settings");
        }
        transition(supplier, SupplierWorkflow.MAKE_CONDITIONAL, v, reason, actorId, actorName, ip, ua);
        return supplier;
    }

    /** Record a supplier audit as a qualification assessment (does not change status). */
    @Transactional
    public SupplierQualification recordAudit(Long id, RecordAuditRequest request,
                                             Long actorId, String actorName, String ip, String ua) {
        require(id);
        SupplierQualification q = new SupplierQualification();
        q.setSupplierId(id);
        q.setAssessmentMethod(request.assessmentMethod());
        q.setAssessmentDate(request.assessmentDate() != null ? request.assessmentDate() : Instant.now(clock));
        q.setAssessor(request.assessor() != null ? request.assessor() : actorName);
        q.setApprovalStatus(request.approvalStatus());
        q.setNotes(request.notes());
        q = qualificationRepository.save(q);
        audit(id, AuditAction.UPDATE, "supplier_audit", null, request.assessmentMethod(),
                "Supplier audit recorded", actorId, actorName, ip, ua);
        return q;
    }

    @Transactional
    public SupplierCertification uploadCertificate(Long id, UploadCertificateRequest request,
                                                   Long actorId, String actorName, String ip, String ua) {
        require(id);
        SupplierCertification c = new SupplierCertification();
        c.setSupplierId(id);
        c.setCertType(request.certType());
        c.setIssueDate(request.issueDate());
        c.setExpiryDate(request.expiryDate());
        c.setFilePath(request.filePath());
        c = certificationRepository.save(c);
        audit(id, AuditAction.UPDATE, "certification", null, request.certType(),
                "Supplier certificate uploaded", actorId, actorName, ip, ua);
        return c;
    }

    @Transactional
    public SupplierPerformance recordPerformance(Long id, RecordPerformanceRequest request,
                                                 Long actorId, String actorName, String ip, String ua) {
        require(id);
        SupplierPerformance p = new SupplierPerformance();
        p.setSupplierId(id);
        p.setAssessmentPeriodStart(request.assessmentPeriodStart());
        p.setAssessmentPeriodEnd(request.assessmentPeriodEnd());
        p.setOnTimeDeliveryPct(request.onTimeDeliveryPct());
        p.setQualityAcceptancePct(request.qualityAcceptancePct());
        p.setResponsivenessRating(request.responsivenessRating());
        p = performanceRepository.save(p);
        audit(id, AuditAction.UPDATE, "performance", null, "scorecard recorded",
                "Supplier performance recorded", actorId, actorName, ip, ua);
        return p;
    }

    @Transactional
    public SupplierFinding issueFinding(Long id, IssueFindingRequest request,
                                        Long actorId, String actorName, String ip, String ua) {
        require(id);
        SupplierFinding f = new SupplierFinding();
        f.setSupplierId(id);
        f.setFindingDate(Instant.now(clock));
        f.setFindingDescription(request.findingDescription());
        f.setSeverity(request.severity());
        f.setRootCause(request.rootCause());
        f.setCorrectiveActionRequired(request.correctiveActionRequired()
                || request.severity() == FindingSeverity.CRITICAL);
        f = findingRepository.save(f);
        audit(id, AuditAction.UPDATE, "finding", null, request.severity().name(),
                "Supplier finding issued", actorId, actorName, ip, ua);
        return f;
    }

    @Transactional
    public Capa createCapaFromFinding(Long id, CreateCapaFromFindingRequest request,
                                      Long actorId, String actorName, String ip, String ua) {
        Supplier supplier = require(id);
        SupplierFinding finding = findingRepository.findById(request.findingId())
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + request.findingId()));
        if (!finding.getSupplierId().equals(id)) {
            throw new WorkflowException("Finding " + request.findingId() + " does not belong to supplier " + id);
        }
        String title = (request.title() != null && !request.title().isBlank())
                ? request.title()
                : "CAPA for supplier " + supplier.getSupplierCode();
        String description = (request.description() != null && !request.description().isBlank())
                ? request.description()
                : finding.getFindingDescription();
        Capa capa = capaService.create(
                new CreateCapaRequest(title, CapaSource.SUPPLIER, description,
                        request.effectivenessCheckRequired(), request.dueDate(),
                        null, null, null, null, null, null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null),
                actorId, actorName, ip, ua);

        SupplierCapaLink link = new SupplierCapaLink();
        link.setSupplierFindingId(finding.getId());
        link.setCapaId(capa.getId());
        capaLinkRepository.save(link);

        audit(id, AuditAction.UPDATE, "capa_link", null, capa.getCapaNumber(),
                request.reason() != null ? request.reason() : "CAPA created from supplier finding",
                actorId, actorName, ip, ua);
        return capa;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(SupplierWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // --- internals -----------------------------------------------------------------------------

    private void transition(Supplier supplier, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(SupplierWorkflow.DEFINITION, supplier,
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
                .recordType(SupplierWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private Supplier require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));
    }
}
