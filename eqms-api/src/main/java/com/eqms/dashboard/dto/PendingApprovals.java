package com.eqms.dashboard.dto;

import java.util.List;
import java.util.Map;

/** Records awaiting the current user's approval (pending-approval, not self-authored, authority held). */
public record PendingApprovals(
        int total,
        Map<String, Integer> byModule,
        List<TaskItem> items
) {
}
