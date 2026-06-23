package com.eqms.deviations.dto;

import com.eqms.deviations.ContainmentActionStatus;

public record UpdateContainmentActionRequest(
        ContainmentActionStatus status,
        String completionEvidence,
        Long verifiedById,
        String comments
) {
}
