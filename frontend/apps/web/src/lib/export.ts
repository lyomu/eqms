type ExportFormat = "csv" | "xls";

export function exportRows(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>, format: ExportFormat) {
  const safeName = filename.replace(/[\\/:*?"<>|]+/g, "-");
  const content = format === "csv" ? toCsv(headers, rows) : toExcelHtml(headers, rows);
  const blob = new Blob([content], {
    type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.${format === "csv" ? "csv" : "xls"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toExcelHtml(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const tableRows = [headers, ...rows]
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell == null ? "" : String(cell))}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
