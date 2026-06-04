package com.eqms.materials;

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
import com.eqms.materials.dto.CreateMaterialRequest;
import com.eqms.materials.dto.UpdateMaterialRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowException;
import com.eqms.workflows.WorkflowService;

/**
 * Material Management application service. Master data with a workflow: numbering via
 * {@link SequenceService}, status changes via {@link WorkflowService}, approval signature via
 * {@link SignatureService}. Detail edits are version-checked and audited here.
 */
@Service
public class MaterialService {

    private static final String MATERIAL_PREFIX = "MAT";

    private final MaterialRepository repository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public MaterialService(MaterialRepository repository, SequenceService sequenceService,
                           WorkflowService workflowService, SignatureService signatureService,
                           AuditService auditService, Clock utcClock) {
        this.repository = repository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public Material create(CreateMaterialRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(MATERIAL_PREFIX, year);

        Material material = new Material();
        material.setMaterialCode(code);
        material.setName(request.name());
        material.setMaterialType(request.materialType());
        material.setUnitOfMeasure(request.unitOfMeasure());
        material.setSpecification(request.specification());
        material.setDescription(request.description());
        material.setMaterialStatus(MaterialStatus.DRAFT);
        material = repository.save(material);

        audit(material.getId(), AuditAction.CREATE, null, null, code, "Material created",
                actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material update(Long id, UpdateMaterialRequest request, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        checkVersion(material.getVersion(), request.expectedVersion());
        if (material.getMaterialStatus() != MaterialStatus.DRAFT) {
            throw new WorkflowException("Material details can only be edited while in DRAFT");
        }
        material.setDescription(request.description());
        material.setSpecification(request.specification());
        audit(material.getId(), AuditAction.UPDATE, "details", null, "description/specification",
                request.reason() != null ? request.reason() : "Material details updated", actorId, actorName, ip, ua);
        return material;
    }

    @Transactional(readOnly = true)
    public Page<Material> list(MaterialStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable) : repository.findByMaterialStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Material get(Long id) {
        return require(id);
    }

    @Transactional
    public Material submitForApproval(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        material.setSubmittedBy(actorId);
        transition(material, MaterialWorkflow.SUBMIT_FOR_APPROVAL, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material approve(Long id, int v, String reason, String password, String totpCode,
                            boolean firstSignatureInSession, String meaningStatement,
                            Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(MaterialWorkflow.RECORD_TYPE).recordId(String.valueOf(material.getId()))
                .contentHash(material.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement : "I approve this material for use.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        transition(material, MaterialWorkflow.APPROVE, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material reject(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material putOnHold(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.PUT_ON_HOLD, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material release(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.RELEASE, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material obsolete(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.OBSOLETE, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(MaterialWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(Material material, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(MaterialWorkflow.DEFINITION, material,
                TransitionRequest.builder(action)
                        .expectedVersion(expectedVersion)
                        .actingUser(actorId, actorName)
                        .reason(reason)
                        .ipAddress(ip).userAgent(userAgent)
                        .build());
    }

    private void audit(Long id, AuditAction action, String field, String oldValue, String newValue,
                       String reason, Long actorId, String actorName, String ip, String userAgent) {
        auditService.record(AuditEntryRequest.builder()
                .recordType(MaterialWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
                .action(action).fieldName(field).oldValue(oldValue).newValue(newValue)
                .reasonForChange(reason)
                .userId(actorId).userFullName(actorName).ipAddress(ip).userAgent(userAgent)
                .build());
    }

    private void checkVersion(int current, int expected) {
        if (current != expected) {
            throw new StaleVersionException("Stale version: record is at v" + current
                    + " but the request was made against v" + expected);
        }
    }

    private Material require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));
    }
}
