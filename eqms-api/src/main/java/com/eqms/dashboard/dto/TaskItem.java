package com.eqms.dashboard.dto;

import java.time.Instant;

/** A single actionable item surfaced on the dashboard (a task, an approval, or an overdue record). */
public record TaskItem(
        String module,
        Long recordId,
        String recordNumber,
        String status,
        Instant dueDate
) {
}
