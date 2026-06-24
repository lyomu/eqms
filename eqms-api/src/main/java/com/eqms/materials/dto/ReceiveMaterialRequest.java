package com.eqms.materials.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record ReceiveMaterialRequest(
        @NotNull Long supplierId,
        String manufacturer,
        String supplierLotNumber,
        String purchaseOrderNumber,
        String deliveryNoteNumber,
        String invoiceNumber,
        @NotNull LocalDate dateReceived,
        @NotNull BigDecimal quantityReceived,
        @NotNull String unitOfMeasure,
        Integer numberOfContainers,
        String containerCondition,
        String transportCondition,
        String storageConditionOnArrival,
        Boolean coaReceived,
        Boolean sdsReceived,
        LocalDate expiryDate,
        LocalDate retestDate,
        String storageLocation,
        String initialStatus,
        String receiptNotes
) {
}
