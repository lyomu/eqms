package com.eqms.products;

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
import com.eqms.products.dto.CreateProductRequest;
import com.eqms.products.dto.UpdateProductRequest;
import com.eqms.sequences.SequenceService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.signatures.SignatureRequest;
import com.eqms.signatures.SignatureService;
import com.eqms.workflows.StaleVersionException;
import com.eqms.workflows.TransitionRequest;
import com.eqms.workflows.WorkflowService;

/**
 * Product Management application service. Master data with a workflow: numbering via
 * {@link SequenceService}, status changes via {@link WorkflowService}, activation signature via
 * {@link SignatureService}. Detail edits are version-checked and audited here.
 */
@Service
public class ProductService {

    private static final String PRODUCT_PREFIX = "PROD";

    private final ProductRepository repository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final Clock clock;

    public ProductService(ProductRepository repository, SequenceService sequenceService,
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
    public Product create(CreateProductRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(PRODUCT_PREFIX, year);

        Product product = new Product();
        product.setProductCode(code);
        product.setName(request.name());
        product.setDosageForm(request.dosageForm());
        product.setStrength(request.strength());
        product.setDescription(request.description());
        product.setRegistrationNumber(request.registrationNumber());
        product.setProductStatus(ProductStatus.DRAFT);
        product = repository.save(product);

        audit(product.getId(), AuditAction.CREATE, null, null, code, "Product created",
                actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product update(Long id, UpdateProductRequest request, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        checkVersion(product.getVersion(), request.expectedVersion());
        if (product.getProductStatus() != ProductStatus.DRAFT) {
            throw new com.eqms.workflows.WorkflowException("Product details can only be edited while in DRAFT");
        }
        product.setDescription(request.description());
        product.setStrength(request.strength());
        product.setRegistrationNumber(request.registrationNumber());
        audit(product.getId(), AuditAction.UPDATE, "details", null, "description/strength/registration",
                request.reason() != null ? request.reason() : "Product details updated", actorId, actorName, ip, ua);
        return product;
    }

    @Transactional(readOnly = true)
    public Page<Product> list(ProductStatus status, Pageable pageable) {
        return status == null ? repository.findAll(pageable) : repository.findByProductStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Product get(Long id) {
        return require(id);
    }

    @Transactional
    public Product submitForApproval(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        product.setSubmittedBy(actorId);
        transition(product, ProductWorkflow.SUBMIT_FOR_APPROVAL, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product approve(Long id, int v, String reason, String password, String totpCode,
                           boolean firstSignatureInSession, String meaningStatement,
                           Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        signatureService.sign(SignatureRequest.builder()
                .userId(actorId)
                .recordType(ProductWorkflow.RECORD_TYPE).recordId(String.valueOf(product.getId()))
                .contentHash(product.workflowContentHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement(meaningStatement != null ? meaningStatement : "I approve this product for activation.")
                .password(password)
                .firstSignatureInSession(firstSignatureInSession)
                .totpCode(totpCode)
                .ipAddress(ip).userAgent(ua)
                .build());
        transition(product, ProductWorkflow.APPROVE, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product reject(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        transition(product, ProductWorkflow.REJECT, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product putOnHold(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        transition(product, ProductWorkflow.PUT_ON_HOLD, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product resume(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        transition(product, ProductWorkflow.RESUME, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional
    public Product discontinue(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        transition(product, ProductWorkflow.DISCONTINUE, v, reason, actorId, actorName, ip, ua);
        return product;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(ProductWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    private void transition(Product product, String action, int expectedVersion, String reason,
                            Long actorId, String actorName, String ip, String userAgent) {
        workflowService.transition(ProductWorkflow.DEFINITION, product,
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
                .recordType(ProductWorkflow.RECORD_TYPE).recordId(String.valueOf(id))
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

    private Product require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }
}
