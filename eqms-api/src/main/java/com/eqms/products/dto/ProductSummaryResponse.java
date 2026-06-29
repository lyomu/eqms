package com.eqms.products.dto;

public record ProductSummaryResponse(
        long totalProducts,
        long activeProducts,
        long draftProducts,
        long underReviewProducts,
        long obsoleteProducts,
        long productsWithOpenQualityIssues
) {
}
