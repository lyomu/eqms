package com.eqms.reports.dto;

/** A rendered report file ready for download. */
public record ExportResult(
        String filename,
        String contentType,
        byte[] content
) {
}
