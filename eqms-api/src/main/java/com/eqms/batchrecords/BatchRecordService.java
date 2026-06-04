package com.eqms.batchrecords;

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
import com.eqms.batchrecords.dto.AddProductProducedRequest;
import com.eqms.batchrecords.dto.BatchTraceabilityResponse;
import com.eqms.batchrecords.dto.CreateBatchRecordRequest;
import com.eqms.batchrecords.dto.LinkMaterialRequest;
import com.eqms.batchrecords.dto.LinkQcTestRequest;
import com.eqms.batchrecords.dto.RecordDeviationRequest;
import com.eqms.batchrecords.dto.RecordStepRequest;
import com.eqms.batchrecords.dto.UpdateBatchRecordRequest;
import com.eqms.common.ResourceNotFoundException;
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
 * Electronic Batch Records application service. Enforces the core eBR compliance rules:
 * contemporaneous recording, header immutability once manufacturing starts, full traceability,
 * and QA release signature.
 */
@Service
public class BatchRecordService {

    private static final String BATCH_PREFIX = "BATCH";

    private final BatchRecordRepository repository;
    private final BatchProductionStepRepository stepRepository;
    private final BatchMaterialUsedRepository materialRepository;
    private final BatchQcResultRepository qcRepository;
    private final BatchDeviationLinkRepository deviationLinkRepository;
    private final BatchProductProducedRepository productProducedRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public BatchRecordService(BatchRecordRepository repository,
                              BatchProductionStepRepository stepRepository,
                              BatchMaterialUsedRepository materialRepository,
                              BatchQcResultRepository qcRepository,
                              BatchDeviationLinkRepository deviationLinkRepository,
                              BatchProductProducedRepository productProducedRepository,
                              SequenceService sequenceService,
                              WorkflowService workflowService,
                              SignatureService signatureService,
                              AuditService auditService,
                              Clock utcClock) {
        this.repository = repository;
        this.stepRepository = stepRepository;
        this.materialRepository = materialRepository;
        this.qcRepository = qcRepository;
        this.deviationLinkRepository = deviationLinkRepository;
        this.productProducedRepository = productProducedRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public BatchRecord create(CreateBatchRecordRequest request, Long actorId, String actorName,
                              String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String batchNo = sequenceService.next(BATCH_PREFIX, year);

        BatchRecord batch = new BatchRecord();
        batch.setBatchNo(batchNo);
        batch.setProductId(request.productId());
        batch.setProductCode(request.productCode());
        batch.setBatchSize(request.batchSize());
        batch.setUnit(request.unit());
        batch.setManufacturingStartDate(request.manufacturingStartDate());
        batch.setNotes(request.notes());
        batch.setBatchStatus(BatchStatus.IN_PROGRESS);
        batch = repository.save(batch);

        audit(batch.getId(), AuditAction.CREATE, null, null, batchNo,
                "Batch record created", actorId, actorName, ip, ua);
        return batch;
    }

    @Transactional(readOnly = true)
    public Page<BatchRecord> list(BatchStatus status, Long productId, Pageable pageable) {
        if (status != null && productId != null) {
            return repository.findByBatchStatusAndProductId(status, productId, pageable);
        }
        if (status != null) {
            return repository.findByBatchStatus(status, pageable);
        }
        if (productId != null) {
            return repository.findByProductId(productId, pageable);
        }
        return repository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public BatchRecord get(Long id) {
        return require(id);
    }

    @Transactional(readOnly = true)
    public List<BatchProductionStep> getSteps(Long id) {
        require(id);
        return stepRepository.findByBatchRecordIdOrderByStepNumberAsc(id);
    }

    @Transactional(readOnly = true)
    public List<BatchQcResult> getQcResults(Long id) {
        require(id);
        return qcRepository.findByBatchRecordId(id);
    }

    /** Update mutable header fields (manufacturing end date, notes). Only allowed while IN_PROGRESS. */
    @Transactional
    public BatchRecord update(Long id, UpdateBatchRecordRequest request,
                              Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        checkVersion(batch.getVersion(), request.expectedVersion());
        if (batch.getBatchStatus() != BatchStatus.IN_PROGRESS) {
            throw new WorkflowException("Batch record can only be updated while IN_PROGRESS");
        }
        if (request.manufacturingEndDate() != null) {
            batch.setManufacturingEndDate(request.manufacturingEndDate());
        }
        if (request.notes() != null) {
            batch.setNotes(request.notes());
        }
        audit(batch.getId(), AuditAction.UPDATE, "details", null, "updated",
                request.reason() != null ? request.reason() : "Batch record updated",
                actorId, actorName, ip, ua);
        return batch;
    }

    /** Record a production step contemporaneously. Append-only — no editing of recorded steps. */
    @Transactional
    public BatchProductionStep recordStep(Long id, RecordStepRequest request,
                                         Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (batch.getBatchStatus() != BatchStatus.IN_PROGRESS) {
            throw new WorkflowException("Production steps can only be recorded while batch is IN_PROGRESS");
        }
        BatchProductionStep step = new BatchProductionStep();
        step.setBatchRecordId(id);
        step.setStepNumber(request.stepNumber());
        step.setStepDescription(request.stepDescription());
        step.setEquipmentUsed(request.equipmentUsed());
        step.setOperatorId(request.operatorId() != null ? request.operatorId() : actorId);
        step.setStartTime(request.startTime());
        step.setEndTime(request.endTime());
        step.setParametersRecorded(request.parametersRecorded());
        step.setAnomaliesNoted(request.anomaliesNoted());
        step = stepRepository.save(step);

        audit(id, AuditAction.CREATE, "production_step", null,
                "Step " + request.stepNumber() + ": " + request.stepDescription(),
                "Production step recorded", actorId, actorName, ip, ua);
        return step;
    }

    /** Link a material lot to this batch. Append-only. */
    @Transactional
    public BatchMaterialUsed linkMaterial(Long id, LinkMaterialRequest request,
                                          Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (batch.getBatchStatus() != BatchStatus.IN_PROGRESS) {
            throw new WorkflowException("Materials can only be linked while batch is IN_PROGRESS");
        }
        BatchMaterialUsed entry = new BatchMaterialUsed();
        entry.setBatchRecordId(id);
        entry.setMaterialId(request.materialId());
        entry.setMaterialCode(request.materialCode());
        entry.setLotNumber(request.lotNumber());
        entry.setSupplier(request.supplier());
        entry.setQuantityUsed(request.quantityUsed());
        entry.setUnit(request.unit());
        entry = materialRepository.save(entry);

        audit(id, AuditAction.CREATE, "material_used", null,
                request.materialCode() + " lot " + request.lotNumber(),
                "Material linked to batch", actorId, actorName, ip, ua);
        return entry;
    }

    /** Link a QC test result. Allowed during IN_PROGRESS or QA_REVIEW. Append-only. */
    @Transactional
    public BatchQcResult linkQcTest(Long id, LinkQcTestRequest request,
                                    Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (batch.getBatchStatus() != BatchStatus.IN_PROGRESS
                && batch.getBatchStatus() != BatchStatus.QA_REVIEW) {
            throw new WorkflowException("QC results can only be linked while batch is IN_PROGRESS or QA_REVIEW");
        }
        BatchQcResult result = new BatchQcResult();
        result.setBatchRecordId(id);
        result.setTestMethod(request.testMethod());
        result.setSpecificationLimit(request.specificationLimit());
        result.setActualResult(request.actualResult());
        result.setTestDate(request.testDate());
        result.setTestStatus(request.testStatus());
        result.setTestLab(request.testLab());
        result.setApprovedBy(request.approvedBy());
        result = qcRepository.save(result);

        audit(id, AuditAction.CREATE, "qc_result", null,
                request.testMethod() + " = " + request.actualResult() + " (" + request.testStatus() + ")",
                "QC result linked", actorId, actorName, ip, ua);
        return result;
    }

    /** Link a deviation that occurred during manufacturing. Idempotent on duplicate. */
    @Transactional
    public BatchDeviationLink recordDeviation(Long id, RecordDeviationRequest request,
                                              Long actorId, String actorName, String ip, String ua) {
        require(id);
        if (deviationLinkRepository.existsByBatchRecordIdAndDeviationId(id, request.deviationId())) {
            return deviationLinkRepository.findByBatchRecordId(id).stream()
                    .filter(l -> l.getDeviationId().equals(request.deviationId()))
                    .findFirst()
                    .orElseThrow();
        }
        BatchDeviationLink link = new BatchDeviationLink();
        link.setBatchRecordId(id);
        link.setDeviationId(request.deviationId());
        link = deviationLinkRepository.save(link);

        audit(id, AuditAction.CREATE, "deviation_link", null, String.valueOf(request.deviationId()),
                request.reason() != null ? request.reason() : "Deviation linked to batch",
                actorId, actorName, ip, ua);
        return link;
    }

    /** Record a product lot produced by this batch. Append-only. */
    @Transactional
    public BatchProductProduced addProductProduced(Long id, AddProductProducedRequest request,
                                                   Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (batch.getBatchStatus() != BatchStatus.IN_PROGRESS) {
            throw new WorkflowException("Products produced can only be recorded while batch is IN_PROGRESS");
        }
        BatchProductProduced product = new BatchProductProduced();
        product.setBatchRecordId(id);
        product.setProductId(request.productId());
        product.setProductCode(request.productCode());
        product.setLotNumberAssigned(request.lotNumberAssigned());
        product.setQuantity(request.quantity());
        product.setUnit(request.unit());
        product = productProducedRepository.save(product);

        audit(id, AuditAction.CREATE, "product_produced", null,
                request.productCode() + " lot " + request.lotNumberAssigned(),
                "Product produced recorded", actorId, actorName, ip, ua);
        return product;
    }

    /** Submit batch for QA review. Requires at least one production step recorded. */
    @Transactional
    public BatchRecord submitForQaReview(Long id, int v, String reason,
                                         Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (stepRepository.countByBatchRecordId(id) == 0) {
            throw new WorkflowException("At least one production step must be recorded before QA review");
        }
        batch.setSubmittedBy(actorId);
        transition(batch, BatchWorkflow.SUBMIT_FOR_QA_REVIEW, v, reason, actorId, actorName, ip, ua);
        return batch;
    }

    /** QA releases the batch. Requires at least one QC result and a RELEASED e-signature. */
    @Transactional
    public BatchRecord release(Long id, int v, String reason, String password, String totpCode,
                               boolean firstSignatureInSession, String meaningStatement,
                               Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        if (qcRepository.countByBatchRecordId(id) == 0) {
            throw new WorkflowException("At least one QC result must be linked before release");
        }
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(BatchWorkflow.RECORD_TYPE).recordId(String.valueOf(batch.getId()))
                .contentHash(batch.workflowContentHash())
                .meaning(SignatureMeaning.RELEASED)
                .meaningStatement(meaningStatement != null ? meaningStatement
                        : "I hereby release this batch for distribution.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        transition(batch, BatchWorkflow.RELEASE, v, reason, actorId, actorName, ip, ua);
        batch.setReleasedBy(actorId);
        batch.setReleasedAt(Instant.now(clock));
        return batch;
    }

    @Transactional
    public BatchRecord reject(Long id, int v, String reason,
                              Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        transition(batch, BatchWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return batch;
    }

    @Transactional
    public BatchRecord quarantine(Long id, int v, String reason,
                                  Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        transition(batch, BatchWorkflow.QUARANTINE, v, reason, actorId, actorName, ip, ua);
        return batch;
    }

    @Transactional
    public BatchRecord recall(Long id, int v, String reason,
                              Long actorId, String actorName, String ip, String ua) {
        BatchRecord batch = require(id);
        transition(batch, BatchWorkflow.RECALL, v, reason, actorId, actorName, ip, ua);
        return batch;
    }

    @Transactional(readOnly = true)
    public BatchTraceabilityResponse traceability(Long id) {
        BatchRecord batch = require(id);
        List<BatchTraceabilityResponse.MaterialEntry> materials =
                materialRepository.findByBatchRecordId(id).stream()
                        .map(BatchTraceabilityResponse.MaterialEntry::from).toList();
        List<BatchTraceabilityResponse.ProductEntry> products =
                productProducedRepository.findByBatchRecordId(id).stream()
                        .map(BatchTraceabilityResponse.ProductEntry::from).toList();
        return new BatchTraceabilityResponse(id, batch.getBatchNo(), batch.getProductCode(), materials, products);
    }

    @Transactional(readOnly = true)
    public List<BatchDeviationLink> getDeviations(Long id) {
        require(id);
        return deviationLinkRepository.findByBatchRecordId(id);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(BatchWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(BatchRecord batch, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        workflowService.transition(BatchWorkflow.DEFINITION, batch,
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
                .recordType(BatchWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private BatchRecord require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch record not found: " + id));
    }
}
