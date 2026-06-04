package com.eqms.complaints.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.complaints.Complaint;
import com.eqms.complaints.ComplaintInvestigation;
import com.eqms.complaints.ComplaintResolution;

/** Detail view of a complaint, including its investigation, resolution, and linked CAPA ids. */
public record ComplaintResponse(
        Long id,
        String complaintNo,
        Long productId,
        String complaintDescription,
        String source,
        String severity,
        String status,
        int version,
        Instant reportedDate,
        String reportedBy,
        Long ownerId,
        Long submittedBy,
        Instant closedDate,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Investigation investigation,
        Resolution resolution,
        List<Long> linkedCapaIds
) {
    public record Investigation(
            String investigationFindings,
            Long investigatorId,
            Instant investigationDate,
            String rootCause,
            String rootCauseMethod,
            String impactOnProduct
    ) {
        static Investigation from(ComplaintInvestigation i) {
            return new Investigation(i.getInvestigationFindings(), i.getInvestigatorId(), i.getInvestigationDate(),
                    i.getRootCause(), i.getRootCauseMethod(), i.getImpactOnProduct());
        }
    }

    public record Resolution(
            String resolutionDescription,
            Instant resolutionDate,
            Long resolvedBy
    ) {
        static Resolution from(ComplaintResolution r) {
            return new Resolution(r.getResolutionDescription(), r.getResolutionDate(), r.getResolvedBy());
        }
    }

    public static ComplaintResponse from(Complaint c, ComplaintInvestigation investigation,
                                         ComplaintResolution resolution, List<Long> linkedCapaIds) {
        return new ComplaintResponse(
                c.getId(), c.getComplaintNo(), c.getProductId(), c.getComplaintDescription(),
                c.getSource().name(), c.getSeverity().name(), c.getComplaintStatus().name(), c.getVersion(),
                c.getReportedDate(), c.getReportedBy(), c.getOwnerId(), c.getSubmittedBy(), c.getClosedDate(),
                c.getCreatedAt(), c.getCreatedBy(), c.getUpdatedAt(),
                investigation == null ? null : Investigation.from(investigation),
                resolution == null ? null : Resolution.from(resolution),
                linkedCapaIds);
    }

    public static ComplaintResponse summary(Complaint c) {
        return from(c, null, null, List.of());
    }
}
