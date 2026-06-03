package com.eqms.documents.dto;

import java.util.List;

/** Lightweight pagination envelope (avoids serializing Spring's Page directly). */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
