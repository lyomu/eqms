package com.eqms.products;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.common.HtmlSanitizer;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.common.dto.IsoReadinessItemResponse;
import com.eqms.common.dto.IsoReadinessResponse;
import com.eqms.products.dto.CreateProductRequest;
import com.eqms.products.dto.ProductApprovalHistoryResponse;
import com.eqms.products.dto.ProductEvidenceRequest;
import com.eqms.products.dto.ProductEvidenceResponse;
import com.eqms.products.dto.ProductResponse;
import com.eqms.products.dto.ProductSummaryResponse;
import com.eqms.products.dto.ProductTraceabilityResponse;
import com.eqms.products.dto.UpdateProductRequest;
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
public class ProductService {

    private static final String PRODUCT_PREFIX = "PROD";

    private final ProductRepository repository;
    private final SequenceService sequenceService;
    private final WorkflowService workflowService;
    private final SignatureService signatureService;
    private final AuditService auditService;
    private final JdbcClient jdbc;
    private final Clock clock;

    public ProductService(ProductRepository repository, SequenceService sequenceService,
                          WorkflowService workflowService, SignatureService signatureService,
                          AuditService auditService, JdbcClient jdbc, Clock utcClock) {
        this.repository = repository;
        this.sequenceService = sequenceService;
        this.workflowService = workflowService;
        this.signatureService = signatureService;
        this.auditService = auditService;
        this.jdbc = jdbc;
        this.clock = utcClock;
    }

    @Transactional
    public Product create(CreateProductRequest request, Long actorId, String actorName, String ip, String ua) {
        int year = Instant.now(clock).atZone(ZoneOffset.UTC).getYear();
        String code = sequenceService.next(PRODUCT_PREFIX, year);

        Product product = new Product();
        product.setProductCode(code);
        product.setName(request.name());
        product.setDosageForm(request.dosageForm() != null ? request.dosageForm() : DosageForm.OTHER);
        product.setProductType(coalesce(request.productType(), product.getDosageForm().name()));
        applyMasterData(product, request, actorId);
        product.setProductStatus(ProductStatus.DRAFT);
        product = repository.save(product);

        audit(product.getId(), AuditAction.CREATE, null, null, code, "Product created", actorId, actorName, ip, ua);
        history(product.getId(), "Created", null, product.getStatus(), actorId, actorName, "Product created");
        return product;
    }

    @Transactional
    public Product update(Long id, UpdateProductRequest request, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        checkVersion(product.getVersion(), request.expectedVersion());
        if (product.getProductStatus() != ProductStatus.DRAFT) {
            throw new com.eqms.workflows.WorkflowException(
                    "Approved or submitted products cannot be edited directly. Create a revision or change control.");
        }
        if (StringUtils.hasText(request.name())) {
            product.setName(request.name().trim());
        }
        product.setProductType(coalesce(request.productType(), product.getProductType()));
        product.setCategory(blankToNull(request.category()));
        product.setDescription(sanitize(request.description()));
        product.setIntendedUse(sanitize(request.intendedUse()));
        if (request.criticality() != null) product.setCriticality(request.criticality());
        if (request.ownerId() != null) product.setOwnerId(request.ownerId());
        product.setDepartment(blankToNull(request.department()));
        product.setSiteLocation(blankToNull(request.siteLocation()));
        product.setRevision(coalesce(request.revision(), product.getRevision()));
        product.setStrength(blankToNull(request.strength()));
        product.setSpecificationReference(coalesce(request.specificationReference(), request.registrationNumber()));
        product.setStorageRequirements(sanitize(request.storageRequirements()));
        product.setShelfLife(blankToNull(request.shelfLife()));
        product.setExpiryRequired(Boolean.TRUE.equals(request.expiryRequired()));
        product.setQcTestingRequired(Boolean.TRUE.equals(request.qcTestingRequired()));
        product.setBatchLotTrackingRequired(Boolean.TRUE.equals(request.batchLotTrackingRequired()));
        product.setRegulatoryCustomerRequirements(sanitize(request.regulatoryCustomerRequirements()));
        product.setNotes(sanitize(request.notes()));
        product.setRegistrationNumber(blankToNull(request.registrationNumber()));
        audit(product.getId(), AuditAction.UPDATE, "details", null, "product master fields",
                coalesce(request.reason(), "Product details updated"), actorId, actorName, ip, ua);
        return product;
    }

    @Transactional(readOnly = true)
    public Page<Product> list(ProductStatus status, String search, String productType, String category,
                              ProductCriticality criticality, Long ownerId, String specificationStatus,
                              Boolean dueForReview, Boolean openQualityIssues, Pageable pageable) {
        Specification<Product> spec = Specification.where(null);
        if (status != null) spec = spec.and((root, q, cb) -> cb.equal(root.get("productStatus"), status));
        if (StringUtils.hasText(search)) {
            String like = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("productCode")), like),
                    cb.like(cb.lower(root.get("name")), like)));
        }
        if (StringUtils.hasText(productType)) spec = spec.and((root, q, cb) -> cb.equal(root.get("productType"), productType));
        if (StringUtils.hasText(category)) spec = spec.and((root, q, cb) -> cb.equal(root.get("category"), category));
        if (criticality != null) spec = spec.and((root, q, cb) -> cb.equal(root.get("criticality"), criticality));
        if (ownerId != null) spec = spec.and((root, q, cb) -> cb.equal(root.get("ownerId"), ownerId));
        if (StringUtils.hasText(specificationStatus)) spec = spec.and((root, q, cb) -> cb.equal(root.get("specificationStatus"), specificationStatus));
        if (Boolean.TRUE.equals(dueForReview)) {
            LocalDate today = LocalDate.now(clock);
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("nextReviewDate"), today));
        }
        if (Boolean.TRUE.equals(openQualityIssues)) {
            List<Long> ids = openQualityIssueProductIds();
            spec = spec.and((root, q, cb) -> ids.isEmpty() ? cb.disjunction() : root.get("id").in(ids));
        }
        return repository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public ProductSummaryResponse summary() {
        return new ProductSummaryResponse(
                repository.count(),
                repository.countByProductStatus(ProductStatus.ACTIVE),
                repository.countByProductStatus(ProductStatus.DRAFT),
                repository.countByProductStatus(ProductStatus.PENDING_APPROVAL),
                repository.countByProductStatus(ProductStatus.DISCONTINUED),
                openQualityIssueProductIds().size());
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
        enforceApprovalReadiness(product);
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
        product.setApprovedBy(actorId);
        product.setApprovedAt(Instant.now(clock));
        product.setSpecificationStatus("APPROVED");
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

    @Transactional
    public Product revise(Long id, int v, String reason, Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        checkVersion(product.getVersion(), v);
        String oldRevision = product.getRevision();
        product.setRevision(nextRevision(oldRevision));
        product.setProductStatus(ProductStatus.DRAFT);
        product.setApprovedBy(null);
        product.setApprovedAt(null);
        product.setSpecificationStatus("DRAFT");
        audit(product.getId(), AuditAction.UPDATE, "revision", oldRevision, product.getRevision(),
                coalesce(reason, "Product revision created"), actorId, actorName, ip, ua);
        history(product.getId(), "Revised", null, product.getStatus(), actorId, actorName, reason);
        return product;
    }

    @Transactional(readOnly = true)
    public List<ProductEvidenceResponse> evidence(Long id, String section) {
        require(id);
        return listRows(table(section), id);
    }

    @Transactional
    public ProductEvidenceResponse addEvidence(Long id, String section, ProductEvidenceRequest request,
                                               Long actorId, String actorName, String ip, String ua) {
        Product product = require(id);
        if (product.getProductStatus() != ProductStatus.DRAFT && product.getProductStatus() != ProductStatus.PENDING_APPROVAL) {
            throw new com.eqms.workflows.WorkflowException(
                    "Approved product evidence changes require a revision or change control.");
        }
        String table = table(section);
        Long rowId = insertRow(table, product, request, actorId);
        audit(id, AuditAction.UPDATE, section, null, "linked record #" + rowId,
                coalesce(request.reason(), section + " linked"), actorId, actorName, ip, ua);
        return listRows(table, id).stream().filter(row -> row.id().equals(rowId)).findFirst().orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<ProductEvidenceResponse> batches(Long id) {
        require(id);
        return batchRows(id);
    }

    @Transactional(readOnly = true)
    public ProductTraceabilityResponse traceability(Long id) {
        Product product = require(id);
        return new ProductTraceabilityResponse(
                ProductResponse.from(product),
                evidence(id, "specifications"),
                evidence(id, "materials"),
                evidence(id, "documents"),
                batches(id),
                evidence(id, "quality-issues"),
                evidence(id, "risks"),
                evidence(id, "change-control"));
    }

    @Transactional(readOnly = true)
    public List<ProductApprovalHistoryResponse> approvalHistory(Long id) {
        require(id);
        return jdbc.sql("""
                SELECT id, action, from_status, to_status, actor_id, actor_name, comment, action_at
                FROM product_approval_history WHERE product_id = :id ORDER BY action_at DESC, id DESC
                """)
                .param("id", id)
                .query((rs, n) -> new ProductApprovalHistoryResponse(
                        rs.getLong("id"), rs.getString("action"), rs.getString("from_status"),
                        rs.getString("to_status"), (Long) rs.getObject("actor_id"),
                        rs.getString("actor_name"), rs.getString("comment"),
                        rs.getTimestamp("action_at").toInstant()))
                .list();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditTrail(Long id) {
        require(id);
        return auditService.trailFor(ProductWorkflow.RECORD_TYPE, String.valueOf(id));
    }

    @Transactional(readOnly = true)
    public IsoReadinessResponse isoReadiness(Long id) {
        return buildReadiness(require(id));
    }

    private void applyMasterData(Product product, CreateProductRequest request, Long actorId) {
        product.setCategory(blankToNull(request.category()));
        product.setStrength(blankToNull(request.strength()));
        product.setDescription(sanitize(request.description()));
        product.setIntendedUse(sanitize(request.intendedUse()));
        product.setCriticality(request.criticality() != null ? request.criticality() : ProductCriticality.MINOR);
        product.setOwnerId(request.ownerId() != null ? request.ownerId() : actorId);
        product.setDepartment(blankToNull(request.department()));
        product.setSiteLocation(blankToNull(request.siteLocation()));
        product.setRevision(coalesce(request.revision(), "A"));
        product.setSpecificationReference(coalesce(request.specificationReference(), request.registrationNumber()));
        product.setStorageRequirements(sanitize(request.storageRequirements()));
        product.setShelfLife(blankToNull(request.shelfLife()));
        product.setExpiryRequired(Boolean.TRUE.equals(request.expiryRequired()));
        product.setQcTestingRequired(Boolean.TRUE.equals(request.qcTestingRequired()));
        product.setBatchLotTrackingRequired(Boolean.TRUE.equals(request.batchLotTrackingRequired()));
        product.setRegulatoryCustomerRequirements(sanitize(request.regulatoryCustomerRequirements()));
        product.setNotes(sanitize(request.notes()));
        product.setRegistrationNumber(blankToNull(request.registrationNumber()));
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
        history(product.getId(), actionTitle(action), null, product.getStatus(), actorId, actorName, reason);
    }

    private void enforceApprovalReadiness(Product product) {
        IsoReadinessResponse readiness = buildReadiness(product);
        if (!readiness.ready()) {
            throw new WorkflowException("Product is not ISO-ready for approval: "
                    + String.join("; ", readiness.blockingMessages()));
        }
    }

    private IsoReadinessResponse buildReadiness(Product product) {
        long approvedSpecifications = countRows("product_specifications", product.getId(), "upper(status) = 'APPROVED'");
        long approvedSpecificationDocuments = countRows("product_documents", product.getId(),
                "document_type = 'Product Specification' AND upper(status) = 'APPROVED'");
        long qcRequirements = countRows("product_qc_requirements", product.getId(), "true");
        long linkedMaterials = countRows("product_material_components", product.getId(), "true");
        long linkedRisks = countRows("product_risk_links", product.getId(), "true");
        long openCriticalIssues = countRows("product_quality_issue_links", product.getId(),
                "upper(coalesce(severity,'')) = 'CRITICAL' AND upper(coalesce(status,'')) NOT IN ('CLOSED','CANCELLED','RESOLVED')");

        List<IsoReadinessItemResponse> items = List.of(
                item("PRODUCT_MASTER_DATA", "Product master data", hasMasterData(product), "HIGH", true, 1,
                        "Name, type, owner, criticality, revision, and description are required."),
                item("SPECIFICATION_REFERENCE", "Specification reference", StringUtils.hasText(product.getSpecificationReference()),
                        "HIGH", true, StringUtils.hasText(product.getSpecificationReference()) ? 1 : 0,
                        "A controlled specification reference is required before approval."),
                item("APPROVED_SPECIFICATION", "Approved specification evidence", approvedSpecifications > 0,
                        "HIGH", true, approvedSpecifications,
                        "At least one approved product specification evidence record is required."),
                item("SPECIFICATION_DOCUMENT", "Approved specification document", approvedSpecificationDocuments > 0,
                        "HIGH", true, approvedSpecificationDocuments,
                        "A linked approved Product Specification document is required."),
                item("QC_RELEASE_REQUIREMENTS", "QC and release requirements",
                        !product.isQcTestingRequired() || qcRequirements > 0, "MEDIUM",
                        product.isQcTestingRequired(), qcRequirements,
                        "Products requiring QC testing need QC/release requirements evidence."),
                item("MATERIAL_TRACEABILITY", "Material/component traceability",
                        !product.isBatchLotTrackingRequired() || linkedMaterials > 0, "MEDIUM",
                        product.isBatchLotTrackingRequired(), linkedMaterials,
                        "Batch/lot tracked products need linked materials or components."),
                item("RISK_ASSESSMENT", "Risk assessment", product.getCriticality() != ProductCriticality.CRITICAL || linkedRisks > 0,
                        "HIGH", product.getCriticality() == ProductCriticality.CRITICAL, linkedRisks,
                        "Critical products require a linked risk assessment."),
                item("CRITICAL_QUALITY_ISSUES", "Open critical quality issues", openCriticalIssues == 0,
                        "HIGH", true, openCriticalIssues,
                        "Open critical quality issues must be resolved before approval.")
        );

        List<String> blockers = items.stream()
                .filter(IsoReadinessItemResponse::blocking)
                .map(IsoReadinessItemResponse::message)
                .toList();
        long passed = items.stream().filter(i -> "PASS".equals(i.status())).count();
        int score = items.isEmpty() ? 100 : (int) Math.round((passed * 100.0) / items.size());
        return new IsoReadinessResponse(ProductWorkflow.RECORD_TYPE, String.valueOf(product.getId()),
                blockers.isEmpty(), score, items, blockers);
    }

    private boolean hasMasterData(Product product) {
        return StringUtils.hasText(product.getName())
                && StringUtils.hasText(product.getProductType())
                && product.getOwnerId() != null
                && product.getCriticality() != null
                && StringUtils.hasText(product.getRevision())
                && StringUtils.hasText(product.getDescription());
    }

    private IsoReadinessItemResponse item(String code, String label, boolean passed, String severity,
                                          boolean required, long evidenceCount, String message) {
        return new IsoReadinessItemResponse(code, label, passed ? "PASS" : "FAIL", severity, required,
                evidenceCount, passed ? "Ready." : message);
    }

    private long countRows(String table, Long productId, String predicate) {
        return jdbc.sql("SELECT count(*) FROM " + table + " WHERE product_id = :id AND deleted_at IS NULL AND " + predicate)
                .param("id", productId)
                .query(Long.class)
                .single();
    }

    private List<Long> openQualityIssueProductIds() {
        return jdbc.sql("""
                SELECT DISTINCT product_id FROM product_quality_issue_links
                WHERE deleted_at IS NULL AND upper(coalesce(status,'')) NOT IN ('CLOSED','CANCELLED','RESOLVED')
                """)
                .query(Long.class)
                .list();
    }

    private List<ProductEvidenceResponse> listRows(String table, Long productId) {
        return jdbc.sql("SELECT * FROM " + table + " WHERE product_id = :id AND deleted_at IS NULL ORDER BY created_at DESC, id DESC")
                .param("id", productId)
                .query((rs, n) -> new ProductEvidenceResponse(
                        rs.getLong("id"), rowValues(rs), rs.getTimestamp("created_at").toInstant(),
                        (Long) rs.getObject("created_by")))
                .list();
    }

    private Map<String, Object> rowValues(ResultSet rs) throws SQLException {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("reference", first(rs, "specification_reference", "reference_number", "document_name", "risk_reference"));
        values.put("name", first(rs, "material_name", "process_name", "document_name"));
        values.put("type", first(rs, "document_type", "record_type", "change_type"));
        values.put("title", first(rs, "title"));
        values.put("status", first(rs, "status"));
        values.put("severity", first(rs, "severity", "risk_level"));
        values.put("owner", first(rs, "owner", "risk_owner", "process_owner"));
        values.put("notes", first(rs, "notes"));
        values.put("reviewDate", first(rs, "review_date"));
        values.put("dueDate", first(rs, "due_date"));
        return values;
    }

    private List<ProductEvidenceResponse> batchRows(Long productId) {
        return jdbc.sql("""
                SELECT id, batch_no, product_code, status, released_by, released_at, created_at, created_by
                FROM batch_records WHERE product_id = :id ORDER BY created_at DESC, id DESC
                """)
                .param("id", productId)
                .query((rs, n) -> new ProductEvidenceResponse(
                        rs.getLong("id"),
                        Map.of(
                                "reference", coalesce(rs.getString("batch_no"), ""),
                                "name", coalesce(rs.getString("product_code"), ""),
                                "status", coalesce(rs.getString("status"), ""),
                                "releasedBy", coalesce(stringValue(rs, "released_by"), ""),
                                "releasedAt", coalesce(stringValue(rs, "released_at"), "")),
                        rs.getTimestamp("created_at").toInstant(),
                        (Long) rs.getObject("created_by")))
                .list();
    }

    private Long insertRow(String table, Product product, ProductEvidenceRequest r, Long actorId) {
        return switch (table) {
            case "product_specifications" -> jdbc.sql("""
                    INSERT INTO product_specifications (product_id, organization_id, specification_reference, document_id, document_name, revision, effective_date, review_date, test_parameters, acceptance_criteria, storage_conditions, shelf_life, packaging_requirements, labeling_requirements, status, created_by, updated_by)
                    VALUES (:pid,:org,:ref,:docId,:docName,:rev,:eff,:revDate,:test,:criteria,:storage,:shelf,:pack,:label,:status,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId())
                    .param("ref", coalesce(r.specificationReference(), product.getSpecificationReference()))
                    .param("docId", r.documentId()).param("docName", blankToNull(r.documentName())).param("rev", blankToNull(r.revision()))
                    .param("eff", r.effectiveDate()).param("revDate", r.reviewDate()).param("test", sanitize(r.testParameters()))
                    .param("criteria", sanitize(r.acceptanceCriteria())).param("storage", sanitize(r.storageConditions())).param("shelf", blankToNull(r.shelfLife()))
                    .param("pack", sanitize(r.packagingRequirements())).param("label", sanitize(r.labelingRequirements()))
                    .param("status", coalesce(r.status(), "DRAFT")).param("actor", actorId).query(Long.class).single();
            case "product_material_components" -> jdbc.sql("""
                    INSERT INTO product_material_components (product_id, organization_id, material_id, material_code, material_name, quantity_ratio, uom, approved_supplier_required, material_criticality, status, notes, created_by, updated_by)
                    VALUES (:pid,:org,:mid,:code,:name,:qty,:uom,:supplier,:crit,:status,:notes,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("mid", r.materialId())
                    .param("code", blankToNull(r.materialCode())).param("name", coalesce(r.materialName(), "Material / Component"))
                    .param("qty", blankToNull(r.quantityRatio())).param("uom", blankToNull(r.uom()))
                    .param("supplier", Boolean.TRUE.equals(r.approvedSupplierRequired())).param("crit", blankToNull(r.materialCriticality()))
                    .param("status", coalesce(r.status(), "ACTIVE")).param("notes", sanitize(r.notes())).param("actor", actorId)
                    .query(Long.class).single();
            case "product_process_info" -> jdbc.sql("""
                    INSERT INTO product_process_info (product_id, organization_id, process_name, process_owner, site_department, related_sops, equipment_required, environmental_conditions, in_process_controls, process_parameters, validation_required, notes, created_by, updated_by)
                    VALUES (:pid,:org,:name,:owner,:site,:sops,:equip,:env,:controls,:params,:validation,:notes,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("name", coalesce(r.processName(), "Process"))
                    .param("owner", blankToNull(r.processOwner())).param("site", blankToNull(r.siteDepartment())).param("sops", sanitize(r.relatedSops()))
                    .param("equip", sanitize(r.equipmentRequired())).param("env", sanitize(r.environmentalConditions()))
                    .param("controls", sanitize(r.inProcessControls())).param("params", sanitize(r.processParameters()))
                    .param("validation", Boolean.TRUE.equals(r.validationRequired())).param("notes", sanitize(r.notes())).param("actor", actorId)
                    .query(Long.class).single();
            case "product_qc_requirements" -> jdbc.sql("""
                    INSERT INTO product_qc_requirements (product_id, organization_id, qc_testing_required, test_methods, acceptance_criteria, sampling_requirements, release_approval_required, qa_release_role, coa_required, batch_review_required, created_by, updated_by)
                    VALUES (:pid,:org,:qc,:methods,:criteria,:sampling,:release,:role,:coa,:batch,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("qc", Boolean.TRUE.equals(r.qcTestingRequired()))
                    .param("methods", sanitize(r.testMethods())).param("criteria", sanitize(r.acceptanceCriteria())).param("sampling", sanitize(r.samplingRequirements()))
                    .param("release", !Boolean.FALSE.equals(r.releaseApprovalRequired())).param("role", blankToNull(r.qaReleaseRole()))
                    .param("coa", Boolean.TRUE.equals(r.coaRequired())).param("batch", !Boolean.FALSE.equals(r.batchReviewRequired()))
                    .param("actor", actorId).query(Long.class).single();
            case "product_documents" -> jdbc.sql("""
                    INSERT INTO product_documents (product_id, organization_id, document_type, document_name, document_version, status, effective_date, review_date, linked_document_id, verified_by, notes, created_by, updated_by)
                    VALUES (:pid,:org,:type,:name,:ver,:status,:eff,:rev,:doc,:verified,:notes,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("type", coalesce(r.documentType(), "Other"))
                    .param("name", coalesce(r.documentName(), "Document")).param("ver", blankToNull(r.documentVersion())).param("status", coalesce(r.status(), "DRAFT"))
                    .param("eff", r.effectiveDate()).param("rev", r.reviewDate()).param("doc", r.linkedDocumentId()).param("verified", r.verifiedBy())
                    .param("notes", sanitize(r.notes())).param("actor", actorId).query(Long.class).single();
            case "product_quality_issue_links" -> jdbc.sql("""
                    INSERT INTO product_quality_issue_links (product_id, organization_id, record_type, record_id, reference_number, title, severity, status, owner, due_date, notes, created_by, updated_by)
                    VALUES (:pid,:org,:type,:rid,:ref,:title,:severity,:status,:owner,:due,:notes,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("type", coalesce(r.recordType(), "Deviation"))
                    .param("rid", r.recordId()).param("ref", coalesce(r.referenceNumber(), "Linked Record")).param("title", sanitize(coalesce(r.title(), "Linked quality issue")))
                    .param("severity", blankToNull(r.severity())).param("status", coalesce(r.status(), "OPEN")).param("owner", blankToNull(r.owner()))
                    .param("due", r.dueDate()).param("notes", sanitize(r.notes())).param("actor", actorId).query(Long.class).single();
            case "product_risk_links" -> jdbc.sql("""
                    INSERT INTO product_risk_links (product_id, organization_id, risk_reference, risk_level, risk_owner, inherent_risk, controls, residual_risk, review_date, status, created_by, updated_by)
                    VALUES (:pid,:org,:ref,:level,:owner,:inherent,:controls,:residual,:review,:status,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("ref", coalesce(r.riskReference(), "Risk Assessment"))
                    .param("level", blankToNull(r.riskLevel())).param("owner", blankToNull(r.riskOwner())).param("inherent", sanitize(r.inherentRisk()))
                    .param("controls", sanitize(r.controls())).param("residual", sanitize(r.residualRisk())).param("review", r.reviewDate())
                    .param("status", coalesce(r.status(), "OPEN")).param("actor", actorId).query(Long.class).single();
            case "product_change_control_links" -> jdbc.sql("""
                    INSERT INTO product_change_control_links (product_id, organization_id, change_type, reference_number, title, status, owner, due_date, notes, created_by, updated_by)
                    VALUES (:pid,:org,:type,:ref,:title,:status,:owner,:due,:notes,:actor,:actor) RETURNING id
                    """)
                    .param("pid", product.getId()).param("org", product.getOrganizationId()).param("type", coalesce(r.changeType(), "Product change"))
                    .param("ref", coalesce(r.referenceNumber(), "Change Control")).param("title", sanitize(coalesce(r.title(), "Linked change control")))
                    .param("status", coalesce(r.status(), "OPEN")).param("owner", blankToNull(r.owner())).param("due", r.dueDate())
                    .param("notes", sanitize(r.notes())).param("actor", actorId).query(Long.class).single();
            default -> throw new ResourceNotFoundException("Unsupported product section: " + table);
        };
    }

    private String table(String section) {
        return switch (section) {
            case "specifications" -> "product_specifications";
            case "materials" -> "product_material_components";
            case "process" -> "product_process_info";
            case "qc-requirements" -> "product_qc_requirements";
            case "documents" -> "product_documents";
            case "quality-issues" -> "product_quality_issue_links";
            case "risks" -> "product_risk_links";
            case "change-control" -> "product_change_control_links";
            default -> throw new ResourceNotFoundException("Unknown product section: " + section);
        };
    }

    private void history(Long productId, String action, String fromStatus, String toStatus,
                         Long actorId, String actorName, String comment) {
        jdbc.sql("""
                INSERT INTO product_approval_history (product_id, action, from_status, to_status, actor_id, actor_name, comment)
                VALUES (:id,:action,:fromStatus,:toStatus,:actor,:name,:comment)
                """)
                .param("id", productId).param("action", action).param("fromStatus", fromStatus).param("toStatus", toStatus)
                .param("actor", actorId).param("name", actorName).param("comment", sanitize(comment))
                .update();
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

    private static String actionTitle(String action) {
        return switch (action) {
            case ProductWorkflow.SUBMIT_FOR_APPROVAL -> "Submitted for review";
            case ProductWorkflow.APPROVE -> "Approved";
            case ProductWorkflow.REJECT -> "Rejected";
            case ProductWorkflow.PUT_ON_HOLD -> "Suspended";
            case ProductWorkflow.RESUME -> "Reactivated";
            case ProductWorkflow.DISCONTINUE -> "Obsoleted";
            default -> action;
        };
    }

    private static String nextRevision(String current) {
        if (!StringUtils.hasText(current)) return "B";
        String trimmed = current.trim();
        if (trimmed.length() == 1 && trimmed.charAt(0) >= 'A' && trimmed.charAt(0) < 'Z') {
            return String.valueOf((char) (trimmed.charAt(0) + 1));
        }
        return trimmed + "-1";
    }

    private static String first(ResultSet rs, String... columns) throws SQLException {
        for (String column : columns) {
            String value = stringValue(rs, column);
            if (value != null) return value;
        }
        return "";
    }

    private static String stringValue(ResultSet rs, String column) throws SQLException {
        try {
            Object value = rs.getObject(column);
            return value == null ? null : String.valueOf(value);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private static String sanitize(String value) {
        return value == null || value.isBlank() ? null : HtmlSanitizer.sanitize(value);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String coalesce(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred.trim() : fallback;
    }
}
