package com.eqms.batchrecords.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.eqms.batchrecords.BatchMaterialUsed;
import com.eqms.batchrecords.BatchProductProduced;

public record BatchTraceabilityResponse(
        Long batchRecordId,
        String batchNo,
        String productCode,
        List<MaterialEntry> materialsUsed,
        List<ProductEntry> productsProduced
) {
    public record MaterialEntry(
            Long id,
            Long materialId,
            String materialCode,
            String lotNumber,
            String supplier,
            BigDecimal quantityUsed,
            String unit,
            Instant createdAt
    ) {
        public static MaterialEntry from(BatchMaterialUsed m) {
            return new MaterialEntry(m.getId(), m.getMaterialId(), m.getMaterialCode(),
                    m.getLotNumber(), m.getSupplier(), m.getQuantityUsed(), m.getUnit(), m.getCreatedAt());
        }
    }

    public record ProductEntry(
            Long id,
            Long productId,
            String productCode,
            String lotNumberAssigned,
            BigDecimal quantity,
            String unit,
            Instant createdAt
    ) {
        public static ProductEntry from(BatchProductProduced p) {
            return new ProductEntry(p.getId(), p.getProductId(), p.getProductCode(),
                    p.getLotNumberAssigned(), p.getQuantity(), p.getUnit(), p.getCreatedAt());
        }
    }
}
