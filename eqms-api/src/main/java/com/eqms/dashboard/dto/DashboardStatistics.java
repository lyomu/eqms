package com.eqms.dashboard.dto;

/** System-wide counts for the statistics widget. */
public record DashboardStatistics(
        long totalDocuments, long effectiveDocuments,
        long totalChangeControls, long openChangeControls,
        long totalCapas, long openCapas,
        long totalDeviations, long openDeviations,
        long totalProducts, long activeProducts,
        long totalMaterials, long approvedMaterials,
        long totalBatchRecords, long releasedBatchRecords
) {
}
