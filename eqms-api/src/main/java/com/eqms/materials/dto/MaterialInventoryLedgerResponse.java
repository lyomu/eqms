package com.eqms.materials.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.eqms.materials.MaterialInventoryLedger;

public record MaterialInventoryLedgerResponse(
        Long id,
        Long materialId,
        Long materialLotId,
        String transactionType,
        String fromLocation,
        String toLocation,
        BigDecimal quantityIn,
        BigDecimal quantityOut,
        BigDecimal balance,
        String unitOfMeasure,
        Long performedById,
        String referenceDocument,
        String relatedRecordType,
        String relatedRecordId,
        String reason,
        Instant transactionAt,
        Long createdBy
) {
    public static MaterialInventoryLedgerResponse from(MaterialInventoryLedger l) {
        return new MaterialInventoryLedgerResponse(
                l.getId(), l.getMaterialId(), l.getMaterialLotId(),
                l.getTransactionType() != null ? l.getTransactionType().name() : null,
                l.getFromLocation(), l.getToLocation(),
                l.getQuantityIn(), l.getQuantityOut(), l.getBalance(), l.getUnitOfMeasure(),
                l.getPerformedById(), l.getReferenceDocument(),
                l.getRelatedRecordType(), l.getRelatedRecordId(),
                l.getReason(), l.getTransactionAt(), l.getCreatedBy());
    }
}
