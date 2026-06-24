package com.eqms.materials.dto;

import java.math.BigDecimal;

public record UpdateMaterialDetailsRequest(
        int expectedVersion,
        String reason,
        String name,
        String materialType,
        String unitOfMeasure,
        String specification,
        String description,
        String category,
        String criticality,
        String intendedUse,
        String alternativeUnitOfMeasure,
        BigDecimal conversionFactor,
        String grade,
        String casNumber,
        String specificationReference,
        String standardStorageCondition,
        Boolean qcTestingRequired,
        Boolean samplingRequired,
        Boolean coaRequired,
        Boolean sdsRequired,
        Boolean approvedSupplierRequired,
        Boolean expiryDateRequired,
        Boolean retestDateRequired,
        Boolean quarantineRequiredOnReceipt,
        Boolean qaReleaseRequiredBeforeUse,
        Boolean riskAssessmentRequired,
        BigDecimal minimumStockLevel,
        BigDecimal maximumStockLevel,
        BigDecimal reorderLevel,
        BigDecimal reorderQuantity,
        Boolean fefoRequired,
        Boolean fifoRequired,
        String defaultWarehouse,
        String defaultStorageLocation
) {
}
