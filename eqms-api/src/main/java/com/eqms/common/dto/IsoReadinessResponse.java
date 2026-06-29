package com.eqms.common.dto;

import java.util.List;

public record IsoReadinessResponse(
        String recordType,
        String recordId,
        boolean ready,
        int score,
        List<IsoReadinessItemResponse> items,
        List<String> blockingMessages
) {
}
