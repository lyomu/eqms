package com.eqms.materials;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
import com.eqms.materials.dto.CreateQualityIssueLinkRequest;
import com.eqms.materials.dto.CreateSupplierLinkRequest;
import com.eqms.materials.dto.DisposeLotRequest;
import com.eqms.materials.dto.HoldLotRequest;
import com.eqms.materials.dto.IssueMaterialRequest;
import com.eqms.materials.dto.ReceiveMaterialRequest;
import com.eqms.materials.dto.RejectLotRequest;
import com.eqms.materials.dto.ReleaseLotRequest;
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

@Service
public class MaterialService {

    private static final String MATERIAL_PREFIX = "MAT";
    private static final String LOT_PREFIX = "LOT";
    private static final String RECEIPT_PREFIX = "RCP";
    private static final String ISSUE_PREFIX = "ISS";

    private final MaterialRepository repository;
    private final MaterialLotRepository lotRepository;
    private final MaterialReceiptRepository receiptRepository;
    private final MaterialInventoryLedgerRepository ledgerRepository;
    private final MaterialIssueRepository issueRepository;
    private final MaterialSupplierLinkRepository supplierLinkRepository;
    private final MaterialQualityIssueLinkRepository qualityIssueLinkRepository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public MaterialService(MaterialRepository repository,
                           MaterialLotRepository lotRepository,
                           MaterialReceiptRepository receiptRepository,
                           MaterialInventoryLedgerRepository ledgerRepository,
                           MaterialIssueRepository issueRepository,
                           MaterialSupplierLinkRepository supplierLinkRepository,
                           MaterialQualityIssueLinkRepository qualityIssueLinkRepository,
                           SequenceService sequenceService,
                           WorkflowService workflowService,
                           SignatureService signatureService,
                           AuditService auditService,
                           Clock utcClock) {
        this.repository = repository;
        this.lotRepository = lotRepository;
        this.receiptRepository = receiptRepository;
        this.ledgerRepository = ledgerRepository;
        this.issueRepository = issueRepository;
        this.supplierLinkRepository = supplierLinkRepository;
        this.qualityIssueLinkRepository = qualityIssueLinkRepository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    // ─── Material master CRUD ─────────────────────────────────────────────────

    @Transactional
    public Material create(com.eqms.materials.dto.CreateMaterialRequest request,
                           Long actorId, String actorName, String ip, String ua) {
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

        applyEnrichedFields(material, request);

        material = repository.save(material);
        audit(material.getId(), AuditAction.CREATE, null, null, code, "Material created",
                actorId, actorName, ip, ua);
        return material;
    }

    private void applyEnrichedFields(Material m, com.eqms.materials.dto.CreateMaterialRequest r) {
        if (r.category() != null) m.setCategory(MaterialCategory.valueOf(r.category()));
        if (r.criticality() != null) m.setCriticality(MaterialCriticality.valueOf(r.criticality()));
        m.setIntendedUse(r.intendedUse());
        m.setAlternativeUnitOfMeasure(r.alternativeUnitOfMeasure());
        m.setConversionFactor(r.conversionFactor());
        if (r.grade() != null) m.setGrade(MaterialGrade.valueOf(r.grade()));
        m.setCasNumber(r.casNumber());
        m.setSpecificationReference(r.specificationReference());
        if (r.standardStorageCondition() != null)
            m.setStandardStorageCondition(StorageCondition.valueOf(r.standardStorageCondition()));
        if (r.qcTestingRequired() != null) m.setQcTestingRequired(r.qcTestingRequired());
        if (r.samplingRequired() != null) m.setSamplingRequired(r.samplingRequired());
        if (r.coaRequired() != null) m.setCoaRequired(r.coaRequired());
        if (r.sdsRequired() != null) m.setSdsRequired(r.sdsRequired());
        if (r.approvedSupplierRequired() != null) m.setApprovedSupplierRequired(r.approvedSupplierRequired());
        if (r.expiryDateRequired() != null) m.setExpiryDateRequired(r.expiryDateRequired());
        if (r.retestDateRequired() != null) m.setRetestDateRequired(r.retestDateRequired());
        if (r.quarantineRequiredOnReceipt() != null) m.setQuarantineRequiredOnReceipt(r.quarantineRequiredOnReceipt());
        if (r.qaReleaseRequiredBeforeUse() != null) m.setQaReleaseRequiredBeforeUse(r.qaReleaseRequiredBeforeUse());
        if (r.riskAssessmentRequired() != null) m.setRiskAssessmentRequired(r.riskAssessmentRequired());
        m.setMinimumStockLevel(r.minimumStockLevel());
        m.setMaximumStockLevel(r.maximumStockLevel());
        m.setReorderLevel(r.reorderLevel());
        m.setReorderQuantity(r.reorderQuantity());
        if (r.fefoRequired() != null) m.setFefoRequired(r.fefoRequired());
        if (r.fifoRequired() != null) m.setFifoRequired(r.fifoRequired());
        m.setDefaultWarehouse(r.defaultWarehouse());
        m.setDefaultStorageLocation(r.defaultStorageLocation());
    }

    @Transactional
    public Material update(Long id, UpdateMaterialRequest request,
                           Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        checkVersion(material.getVersion(), request.expectedVersion());
        if (material.getMaterialStatus() != MaterialStatus.DRAFT) {
            throw new WorkflowException("Material details can only be edited while in DRAFT");
        }
        material.setDescription(request.description());
        material.setSpecification(request.specification());
        audit(material.getId(), AuditAction.UPDATE, "details", null, "description/specification",
                request.reason() != null ? request.reason() : "Material details updated",
                actorId, actorName, ip, ua);
        return material;
    }

    @Transactional(readOnly = true)
    public Page<Material> list(MaterialStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable)
                : repository.findByMaterialStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Material get(Long id) {
        return require(id);
    }

    // ─── Workflow transitions ─────────────────────────────────────────────────

    @Transactional
    public Material submitForApproval(Long id, int v, String reason,
                                      Long actorId, String actorName, String ip, String ua) {
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
    public Material reject(Long id, int v, String reason,
                           Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material putOnHold(Long id, int v, String reason,
                              Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.PUT_ON_HOLD, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material release(Long id, int v, String reason,
                            Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.RELEASE, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional
    public Material obsolete(Long id, int v, String reason,
                             Long actorId, String actorName, String ip, String ua) {
        Material material = require(id);
        transition(material, MaterialWorkflow.OBSOLETE, v, reason, actorId, actorName, ip, ua);
        return material;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(MaterialWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    // ─── Supplier links ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MaterialSupplierLink> getSupplierLinks(Long materialId) {
        require(materialId);
        return supplierLinkRepository.findByMaterialId(materialId);
    }

    @Transactional
    public MaterialSupplierLink addSupplierLink(Long materialId, CreateSupplierLinkRequest req,
                                                Long actorId, String actorName, String ip, String ua) {
        require(materialId);
        MaterialSupplierLink link = new MaterialSupplierLink();
        link.setMaterialId(materialId);
        link.setSupplierId(req.supplierId());
        link.setApprovedForMaterial(Boolean.TRUE.equals(req.approvedForMaterial()));
        link.setScopeOfApproval(req.scopeOfApproval());
        link.setApprovalConditions(req.approvalConditions());
        if (req.effectiveDate() != null) link.setEffectiveDate(LocalDate.parse(req.effectiveDate()));
        if (req.reviewDate() != null) link.setReviewDate(LocalDate.parse(req.reviewDate()));
        link = supplierLinkRepository.save(link);
        audit(materialId, AuditAction.UPDATE, "suppliers", null,
                "supplier:" + req.supplierId(), "Supplier linked", actorId, actorName, ip, ua);
        return link;
    }

    @Transactional
    public void removeSupplierLink(Long materialId, Long linkId,
                                   Long actorId, String actorName, String ip, String ua) {
        MaterialSupplierLink link = supplierLinkRepository.findById(linkId)
                .filter(l -> l.getMaterialId().equals(materialId))
                .orElseThrow(() -> new ResourceNotFoundException("Supplier link not found: " + linkId));
        supplierLinkRepository.delete(link);
        audit(materialId, AuditAction.UPDATE, "suppliers", "supplier:" + link.getSupplierId(),
                null, "Supplier link removed", actorId, actorName, ip, ua);
    }

    // ─── Lot receiving ────────────────────────────────────────────────────────

    @Transactional
    public MaterialLot receiveMaterial(Long materialId, ReceiveMaterialRequest req,
                                       Long actorId, String actorName, String ip, String ua) {
        Material material = require(materialId);
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();

        String lotNumber = sequenceService.next(LOT_PREFIX, year);
        String receiptNumber = sequenceService.next(RECEIPT_PREFIX, year);

        MaterialLot lot = new MaterialLot();
        lot.setMaterialId(materialId);
        lot.setInternalLotNumber(lotNumber);
        lot.setSupplierLotNumber(req.supplierLotNumber());
        lot.setSupplierId(req.supplierId());
        lot.setManufacturer(req.manufacturer());
        lot.setPurchaseOrderNumber(req.purchaseOrderNumber());
        lot.setDeliveryNoteNumber(req.deliveryNoteNumber());
        lot.setInvoiceNumber(req.invoiceNumber());
        lot.setReceivedQuantity(req.quantityReceived());
        lot.setRemainingQuantity(req.quantityReceived());
        lot.setUnitOfMeasure(req.unitOfMeasure());
        lot.setDateReceived(req.dateReceived());
        lot.setReceivedById(actorId);
        lot.setExpiryDate(req.expiryDate());
        lot.setRetestDate(req.retestDate());
        lot.setStorageLocation(req.storageLocation());
        lot.setLotStatus(material.isQuarantineRequiredOnReceipt() ? LotStatus.QUARANTINED : LotStatus.RECEIVED);
        lot = lotRepository.save(lot);

        MaterialReceipt receipt = new MaterialReceipt();
        receipt.setMaterialId(materialId);
        receipt.setMaterialLotId(lot.getId());
        receipt.setReceiptNumber(receiptNumber);
        receipt.setSupplierId(req.supplierId());
        receipt.setManufacturer(req.manufacturer());
        receipt.setSupplierLotNumber(req.supplierLotNumber());
        receipt.setPurchaseOrderNumber(req.purchaseOrderNumber());
        receipt.setDeliveryNoteNumber(req.deliveryNoteNumber());
        receipt.setInvoiceNumber(req.invoiceNumber());
        receipt.setDateReceived(req.dateReceived());
        receipt.setReceivedById(actorId);
        receipt.setQuantityReceived(req.quantityReceived());
        receipt.setUnitOfMeasure(req.unitOfMeasure());
        receipt.setNumberOfContainers(req.numberOfContainers());
        if (req.containerCondition() != null)
            receipt.setContainerCondition(ContainerCondition.valueOf(req.containerCondition()));
        if (req.transportCondition() != null)
            receipt.setTransportCondition(TransportCondition.valueOf(req.transportCondition()));
        receipt.setStorageConditionOnArrival(req.storageConditionOnArrival());
        receipt.setCoaReceived(Boolean.TRUE.equals(req.coaReceived()));
        receipt.setSdsReceived(Boolean.TRUE.equals(req.sdsReceived()));
        receipt.setExpiryDate(req.expiryDate());
        receipt.setRetestDate(req.retestDate());
        if (req.initialStatus() != null)
            receipt.setInitialStatus(LotReceiptStatus.valueOf(req.initialStatus()));
        receipt.setReceiptNotes(req.receiptNotes());
        receiptRepository.save(receipt);

        ledgerEntry(materialId, lot.getId(), LedgerTransactionType.RECEIPT,
                null, req.storageLocation(), req.quantityReceived(), null, req.quantityReceived(),
                req.unitOfMeasure(), actorId, receiptNumber, "Lot received from supplier");

        audit(materialId, AuditAction.CREATE, "lot", null, lotNumber,
                "Material received: " + lotNumber, actorId, actorName, ip, ua);
        return lot;
    }

    @Transactional(readOnly = true)
    public List<MaterialLot> getLots(Long materialId) {
        require(materialId);
        return lotRepository.findByMaterialIdOrderByCreatedAtDesc(materialId);
    }

    @Transactional(readOnly = true)
    public List<MaterialReceipt> getReceipts(Long materialId) {
        require(materialId);
        return receiptRepository.findByMaterialIdOrderByCreatedAtDesc(materialId);
    }

    // ─── Lot disposition ──────────────────────────────────────────────────────

    @Transactional
    public MaterialLot releaseLot(Long materialId, Long lotId, ReleaseLotRequest req,
                                  Long actorId, String actorName, String ip, String ua) {
        MaterialLot lot = requireLot(materialId, lotId);
        lot.setLotStatus(LotStatus.RELEASED);
        lot.setReleasedAt(Instant.now(clock));
        lot.setReleasedById(actorId);
        if (req.releaseConditions() != null) lot.setReleaseConditions(req.releaseConditions());
        ledgerEntry(materialId, lotId, LedgerTransactionType.RELEASE,
                null, lot.getStorageLocation(), null, null, lot.getRemainingQuantity(),
                lot.getUnitOfMeasure(), actorId, null, req.reason());
        audit(materialId, AuditAction.UPDATE, "lot.status", "QUARANTINED", "RELEASED",
                req.reason(), actorId, actorName, ip, ua);
        return lot;
    }

    @Transactional
    public MaterialLot rejectLot(Long materialId, Long lotId, RejectLotRequest req,
                                 Long actorId, String actorName, String ip, String ua) {
        MaterialLot lot = requireLot(materialId, lotId);
        lot.setLotStatus(LotStatus.REJECTED);
        lot.setRejectedAt(Instant.now(clock));
        lot.setRejectedById(actorId);
        lot.setRejectionReason(req.rejectionReason());
        ledgerEntry(materialId, lotId, LedgerTransactionType.REJECTION,
                lot.getStorageLocation(), null, null, lot.getRemainingQuantity(), null,
                lot.getUnitOfMeasure(), actorId, null, req.rejectionReason());
        audit(materialId, AuditAction.UPDATE, "lot.status", "QUARANTINED", "REJECTED",
                req.rejectionReason(), actorId, actorName, ip, ua);
        return lot;
    }

    @Transactional
    public MaterialLot holdLot(Long materialId, Long lotId, HoldLotRequest req,
                               Long actorId, String actorName, String ip, String ua) {
        MaterialLot lot = requireLot(materialId, lotId);
        lot.setLotStatus(LotStatus.ON_HOLD);
        lot.setHoldReason(req.holdReason());
        ledgerEntry(materialId, lotId, LedgerTransactionType.QC_HOLD,
                null, null, null, null, lot.getRemainingQuantity(),
                lot.getUnitOfMeasure(), actorId, null, req.holdReason());
        audit(materialId, AuditAction.UPDATE, "lot.status", lot.getLotStatus().name(), "ON_HOLD",
                req.holdReason(), actorId, actorName, ip, ua);
        return lot;
    }

    @Transactional
    public MaterialLot disposeLot(Long materialId, Long lotId, DisposeLotRequest req,
                                  Long actorId, String actorName, String ip, String ua) {
        MaterialLot lot = requireLot(materialId, lotId);
        lot.setLotStatus(LotStatus.DISPOSED);
        lot.setDisposedAt(Instant.now(clock));
        lot.setDisposedById(actorId);
        lot.setDisposalReason(req.disposalReason());
        ledgerEntry(materialId, lotId, LedgerTransactionType.DISPOSAL,
                lot.getStorageLocation(), null, null, lot.getRemainingQuantity(), null,
                lot.getUnitOfMeasure(), actorId, null, req.disposalReason());
        audit(materialId, AuditAction.UPDATE, "lot.status", lot.getLotStatus().name(), "DISPOSED",
                req.disposalReason(), actorId, actorName, ip, ua);
        return lot;
    }

    // ─── Material issue ───────────────────────────────────────────────────────

    @Transactional
    public MaterialIssue issueMaterial(Long materialId, Long lotId, IssueMaterialRequest req,
                                       Long actorId, String actorName, String ip, String ua) {
        MaterialLot lot = requireLot(materialId, lotId);
        if (lot.getLotStatus() != LotStatus.RELEASED && lot.getLotStatus() != LotStatus.CONDITIONALLY_RELEASED) {
            throw new WorkflowException("Cannot issue from a lot that is not RELEASED");
        }
        if (lot.getRemainingQuantity() != null
                && req.quantityIssued().compareTo(lot.getRemainingQuantity()) > 0) {
            throw new WorkflowException("Issue quantity exceeds remaining quantity in lot");
        }

        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String issueNumber = sequenceService.next(ISSUE_PREFIX, year);

        if (lot.getRemainingQuantity() != null) {
            lot.setRemainingQuantity(lot.getRemainingQuantity().subtract(req.quantityIssued()));
        }

        MaterialIssue issue = new MaterialIssue();
        issue.setMaterialId(materialId);
        issue.setMaterialLotId(lotId);
        issue.setIssueNumber(issueNumber);
        issue.setQuantityIssued(req.quantityIssued());
        if (req.issuedTo() != null) issue.setIssuedTo(IssueDestination.valueOf(req.issuedTo()));
        issue.setDepartment(req.department());
        issue.setBatchWorkOrderRef(req.batchWorkOrderRef());
        issue.setIssuedById(actorId);
        issue.setIssueDate(req.issueDate());
        issue.setPurposeOfUse(req.purposeOfUse());
        issue.setUsageNotes(req.usageNotes());
        issue = issueRepository.save(issue);

        LedgerTransactionType txType = req.issuedTo() == null ? LedgerTransactionType.ISSUE_TO_DEPARTMENT
                : switch (req.issuedTo()) {
                    case "PRODUCTION" -> LedgerTransactionType.ISSUE_TO_PRODUCTION;
                    case "LABORATORY" -> LedgerTransactionType.ISSUE_TO_LABORATORY;
                    default -> LedgerTransactionType.ISSUE_TO_DEPARTMENT;
                };

        ledgerEntry(materialId, lotId, txType,
                lot.getStorageLocation(), req.department(), null, req.quantityIssued(),
                lot.getRemainingQuantity(), lot.getUnitOfMeasure(), actorId, issueNumber,
                req.purposeOfUse());

        audit(materialId, AuditAction.UPDATE, "lot.remaining", null,
                req.quantityIssued().toPlainString() + " issued",
                "Issue " + issueNumber, actorId, actorName, ip, ua);
        return issue;
    }

    // ─── Inventory ledger ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MaterialInventoryLedger> getMaterialLedger(Long materialId) {
        require(materialId);
        return ledgerRepository.findByMaterialIdOrderByTransactionAtDesc(materialId);
    }

    // ─── Quality issue links ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MaterialQualityIssueLink> getQualityIssueLinks(Long materialId) {
        require(materialId);
        return qualityIssueLinkRepository.findByMaterialId(materialId);
    }

    @Transactional
    public MaterialQualityIssueLink addQualityIssueLink(Long materialId, CreateQualityIssueLinkRequest req,
                                                        Long actorId, String actorName, String ip, String ua) {
        require(materialId);
        MaterialQualityIssueLink link = new MaterialQualityIssueLink();
        link.setMaterialId(materialId);
        link.setMaterialLotId(req.materialLotId());
        link.setRecordType(MaterialQualityRecordType.valueOf(req.recordType()));
        link.setRecordId(req.recordId());
        link.setRecordReference(req.recordReference());
        link.setRecordTitle(req.recordTitle());
        link.setRecordStatus(req.recordStatus());
        link.setNotes(req.notes());
        link = qualityIssueLinkRepository.save(link);
        audit(materialId, AuditAction.UPDATE, "quality_issues", null,
                req.recordType() + ":" + req.recordId(), "Quality issue linked",
                actorId, actorName, ip, ua);
        return link;
    }

    @Transactional
    public void removeQualityIssueLink(Long materialId, Long linkId,
                                       Long actorId, String actorName, String ip, String ua) {
        MaterialQualityIssueLink link = qualityIssueLinkRepository.findById(linkId)
                .filter(l -> l.getMaterialId().equals(materialId))
                .orElseThrow(() -> new ResourceNotFoundException("Quality issue link not found: " + linkId));
        qualityIssueLinkRepository.delete(link);
        audit(materialId, AuditAction.UPDATE, "quality_issues",
                link.getRecordType().name() + ":" + link.getRecordId(), null,
                "Quality issue link removed", actorId, actorName, ip, ua);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private void ledgerEntry(Long materialId, Long lotId, LedgerTransactionType type,
                             String fromLocation, String toLocation,
                             java.math.BigDecimal qtyIn, java.math.BigDecimal qtyOut,
                             java.math.BigDecimal balance, String uom,
                             Long performedById, String referenceDocument, String reason) {
        MaterialInventoryLedger entry = new MaterialInventoryLedger();
        entry.setMaterialId(materialId);
        entry.setMaterialLotId(lotId);
        entry.setTransactionType(type);
        entry.setFromLocation(fromLocation);
        entry.setToLocation(toLocation);
        entry.setQuantityIn(qtyIn);
        entry.setQuantityOut(qtyOut);
        entry.setBalance(balance);
        entry.setUnitOfMeasure(uom);
        entry.setPerformedById(performedById);
        entry.setReferenceDocument(referenceDocument);
        entry.setReason(reason);
        entry.setTransactionAt(Instant.now(clock));
        ledgerRepository.save(entry);
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

    private MaterialLot requireLot(Long materialId, Long lotId) {
        return lotRepository.findById(lotId)
                .filter(l -> l.getMaterialId().equals(materialId))
                .orElseThrow(() -> new ResourceNotFoundException("Lot not found: " + lotId));
    }
}
