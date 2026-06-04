package com.eqms.reports;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.eqms.reports.dto.ReportData;

/**
 * Renders a {@link ReportData} table to CSV or XLSX bytes. Every export is prefixed with a metadata
 * block — generated-at (server UTC), exported-by, and the audit-trail reference — to satisfy the
 * M10 traceability requirement that an export records who produced it and links to the audit entry.
 */
final class ReportExporter {

    private ReportExporter() {
    }

    static byte[] toCsv(ReportData data, Map<String, String> metadata) {
        StringBuilder sb = new StringBuilder();
        metadata.forEach((k, v) -> sb.append(escape(k)).append(',').append(escape(v)).append('\n'));
        sb.append('\n');
        sb.append(String.join(",", data.columns().stream().map(ReportExporter::escape).toList())).append('\n');
        for (List<String> row : data.rows()) {
            sb.append(String.join(",", row.stream().map(ReportExporter::escape).toList())).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    static byte[] toXlsx(ReportData data, Map<String, String> metadata) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName(data.title()));
            int r = 0;
            for (Map.Entry<String, String> e : metadata.entrySet()) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(e.getKey());
                row.createCell(1).setCellValue(e.getValue() == null ? "" : e.getValue());
            }
            r++; // blank spacer row

            Row header = sheet.createRow(r++);
            for (int c = 0; c < data.columns().size(); c++) {
                header.createCell(c).setCellValue(data.columns().get(c));
            }
            for (List<String> dataRow : data.rows()) {
                Row row = sheet.createRow(r++);
                for (int c = 0; c < dataRow.size(); c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(dataRow.get(c) == null ? "" : dataRow.get(c));
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to render XLSX report", ex);
        }
    }

    private static String sheetName(String title) {
        // Excel sheet names max 31 chars and exclude a few characters.
        String safe = title.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        return safe.length() > 31 ? safe.substring(0, 31) : safe;
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
