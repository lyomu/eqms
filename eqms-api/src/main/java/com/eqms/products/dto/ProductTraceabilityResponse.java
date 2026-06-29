package com.eqms.products.dto;

import java.util.List;

public record ProductTraceabilityResponse(
        ProductResponse product,
        List<ProductEvidenceResponse> specifications,
        List<ProductEvidenceResponse> materials,
        List<ProductEvidenceResponse> documents,
        List<ProductEvidenceResponse> batches,
        List<ProductEvidenceResponse> qualityIssues,
        List<ProductEvidenceResponse> risks,
        List<ProductEvidenceResponse> changeControls
) {
}
