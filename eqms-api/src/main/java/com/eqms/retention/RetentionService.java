package com.eqms.retention;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.eqms.common.HtmlSanitizer;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.retention.dto.LegalHoldRequest;
import com.eqms.retention.dto.RetentionPolicyRequest;

@Service
public class RetentionService {

    private final RetentionPolicyRepository policies;
    private final LegalHoldRepository holds;
    private final Clock clock;

    public RetentionService(RetentionPolicyRepository policies, LegalHoldRepository holds, Clock utcClock) {
        this.policies = policies;
        this.holds = holds;
        this.clock = utcClock;
    }

    @Transactional(readOnly = true)
    public List<RetentionPolicy> policies(Long organizationId) {
        return policies.findByOrganizationIdOrderByRecordTypeAsc(organizationId);
    }

    @Transactional
    public RetentionPolicy upsertPolicy(Long organizationId, RetentionPolicyRequest request) {
        RetentionPolicy policy = policies.findByOrganizationIdAndRecordType(organizationId, request.recordType())
                .orElseGet(RetentionPolicy::new);
        policy.setOrganizationId(organizationId);
        policy.setRecordType(request.recordType());
        policy.setRetentionYears(request.retentionYears());
        policy.setDispositionMethod(StringUtils.hasText(request.dispositionMethod())
                ? request.dispositionMethod().trim() : "ARCHIVE_REVIEW");
        policy.setLegalBasis(sanitize(request.legalBasis()));
        policy.setActive(!Boolean.FALSE.equals(request.active()));
        return policies.save(policy);
    }

    @Transactional(readOnly = true)
    public List<LegalHold> holds(Long organizationId, String recordType, String recordId) {
        return holds.findByOrganizationIdAndRecordTypeAndRecordIdOrderByCreatedAtDesc(organizationId, recordType, recordId);
    }

    @Transactional
    public LegalHold placeHold(Long organizationId, LegalHoldRequest request) {
        LegalHold hold = new LegalHold();
        hold.setOrganizationId(organizationId);
        hold.setRecordType(request.recordType());
        hold.setRecordId(request.recordId());
        hold.setReason(sanitize(request.reason()));
        return holds.save(hold);
    }

    @Transactional
    public LegalHold releaseHold(Long organizationId, Long id, Long actorId, String reason) {
        LegalHold hold = holds.findById(id).orElseThrow(() -> new ResourceNotFoundException("Legal hold not found: " + id));
        if (!organizationId.equals(hold.getOrganizationId())) {
            throw new ResourceNotFoundException("Legal hold not found: " + id);
        }
        hold.setReleasedAt(Instant.now(clock));
        hold.setReleasedBy(actorId);
        hold.setReleaseReason(sanitize(reason));
        return hold;
    }

    private static String sanitize(String value) {
        return value == null || value.isBlank() ? null : HtmlSanitizer.sanitize(value);
    }
}
