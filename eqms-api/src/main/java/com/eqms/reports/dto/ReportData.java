package com.eqms.reports.dto;

import java.util.List;

/** A generated report as a simple table: a title, column headers, and string rows. */
public record ReportData(
        String title,
        List<String> columns,
        List<List<String>> rows
) {
}
