package com.eqms.materials.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.eqms.materials.MaterialReceipt;

public record MaterialReceiptResponse(
        Long id,
        Long materialId,
        Long materialLotId,
        String receiptNumber,
        Long supplierId,
        String manufacturer,
        String supplierLotNumber,
        String purchaseOrderNumber,
        String deliveryNoteNumber,
        String invoiceNumber,
        LocalDate dateReceived,
        Long receivedById,
        BigDecimal quantityReceived,
        String unitOfMeasure,
        Integer numberOfContainers,
        String containerCondition,
        String transportCondition,
        String storageConditionOnArrival,
        boolean coaReceived,
        boolean sdsReceived,
        LocalDate expiryDate,
        LocalDate retestDate,
        String initialStatus,
        String receiptNotes,
        Instant createdAt,
        Long createdBy
) {
    public static MaterialReceiptResponse from(MaterialReceipt r) {
        return new MaterialReceiptResponse(
                r.getId(), r.getMaterialId(), r.getMaterialLotId(), r.getReceiptNumber(),
                r.getSupplierId(), r.getManufacturer(), r.getSupplierLotNumber(),
                r.getPurchaseOrderNumber(), r.getDeliveryNoteNumber(), r.getInvoiceNumber(),
                r.getDateReceived(), r.getReceivedById(), r.getQuantityReceived(), r.getUnitOfMeasure(),
                r.getNumberOfContainers(),
                r.getContainerCondition() != null ? r.getContainerCondition().name() : null,
                r.getTransportCondition() != null ? r.getTransportCondition().name() : null,
                r.getStorageConditionOnArrival(), r.isCoaReceived(), r.isSdsReceived(),
                r.getExpiryDate(), r.getRetestDate(),
                r.getInitialStatus() != null ? r.getInitialStatus().name() : null,
                r.getReceiptNotes(), r.getCreatedAt(), r.getCreatedBy());
    }
}
