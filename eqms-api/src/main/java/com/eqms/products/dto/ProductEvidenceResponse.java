package com.eqms.products.dto;

import java.time.Instant;
import java.util.Map;

public record ProductEvidenceResponse(
        Long id,
        Map<String, Object> values,
        Instant createdAt,
        Long createdBy
) {
}
