package com.eqms.search;

import java.time.Instant;

public record GlobalSearchResult(
        String module,
        String recordType,
        Long id,
        String number,
        String title,
        String status,
        String url,
        Instant updatedAt
) {
}
