package com.eqms.common.dto;

public record IsoReadinessItemResponse(
        String code,
        String label,
        String status,
        String severity,
        boolean required,
        long evidenceCount,
        String message
) {
    public boolean blocking() {
        return required && !"PASS".equals(status);
    }
}
