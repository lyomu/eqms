"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { useReport, exportUrl } from "@/hooks/useReports";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { REPORT_BY_SLUG } from "@/types/report";

export default function ReportViewPage() {
  const params = useParams();
  const slug = String(params.slug);
  const def = REPORT_BY_SLUG[slug];
  const report = useReport(def ? slug : "");

  if (!def) return <ErrorAlert title="Unknown report" message="That report does not exist." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/reports" className="hover:underline">Reports</Link>
            <span>/</span><span>{def.title}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{def.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Same-origin download (proxy carries the session cookie); backend audits the export. */}
          <Button asChild variant="outline">
            <a href={exportUrl(def.type, "CSV")}><Download className="h-4 w-4" /> Export CSV</a>
          </Button>
          <Button asChild variant="outline">
            <a href={exportUrl(def.type, "XLSX")}><Download className="h-4 w-4" /> Export Excel</a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {report.isLoading ? (
            <LoadingScreen label="Generating report…" />
          ) : report.isError ? (
            <div className="p-4">
              <ErrorAlert title="Report unavailable" message="Unable to generate this report. It requires audit-view permission." />
            </div>
          ) : !report.data || report.data.rows.length === 0 ? (
            <p className="p-8 text-center text-body text-muted-foreground">No data for this report.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    {report.data.columns.map((c) => (
                      <th key={c} className="px-4 py-2.5 text-label font-medium uppercase tracking-wide text-muted-foreground">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {row.map((cell, j) => <td key={j} className="px-4 py-2.5">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {report.data && report.data.rows.length > 0 && (
        <p className="text-label text-muted-foreground">{report.data.rows.length} row(s).</p>
      )}
    </div>
  );
}
