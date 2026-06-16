import { BarChart3, ClipboardCheck, FileText, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceStatus, DashboardStatistics, PendingApprovals } from "@/types/dashboard";
import { MODULE_LABELS } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface DashboardGraphsProps {
  statistics?: DashboardStatistics;
  compliance?: ComplianceStatus;
  approvals?: PendingApprovals;
}

interface BarItem {
  label: string;
  value: number;
  tone: string;
}

function maxOf(items: BarItem[]) {
  return Math.max(...items.map((item) => item.value), 1);
}

function BarList({ items }: { items: BarItem[] }) {
  const max = maxOf(items);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.max(4, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-label">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-foreground">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", item.tone)} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardGraphs({ statistics, compliance, approvals }: DashboardGraphsProps) {
  const moduleVolume: BarItem[] = statistics
    ? [
        { label: "Documents", value: statistics.totalDocuments, tone: "bg-blue-500" },
        { label: "Change Controls", value: statistics.totalChangeControls, tone: "bg-teal-500" },
        { label: "CAPAs", value: statistics.totalCapas, tone: "bg-green-500" },
        { label: "Deviations", value: statistics.totalDeviations, tone: "bg-amber-500" },
        { label: "Products", value: statistics.totalProducts, tone: "bg-violet-500" },
      ]
    : [];

  const complianceItems: BarItem[] = compliance
    ? [
        { label: "Docs due review", value: compliance.documentsDueForReview, tone: "bg-blue-500" },
        { label: "Overdue CAPAs", value: compliance.overdueCapas, tone: "bg-red-500" },
        { label: "Overdue changes", value: compliance.overdueChangeControls, tone: "bg-amber-500" },
        { label: "Open deviations", value: compliance.openDeviations, tone: "bg-violet-500" },
        { label: "Quarantined batches", value: compliance.quarantinedBatches, tone: "bg-slate-500" },
      ]
    : [];

  const approvalItems: BarItem[] = approvals
    ? Object.entries(approvals.byModule)
        .map(([module, value], index) => ({
          label: MODULE_LABELS[module] ?? module,
          value,
          tone: ["bg-blue-500", "bg-teal-500", "bg-green-500", "bg-amber-500", "bg-violet-500"][index % 5],
        }))
        .slice(0, 6)
    : [];

  if (!statistics && !compliance && !approvals) {
    return null;
  }

  return (
    <section aria-label="Dashboard graphs" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-h3 text-foreground">Quality Trends</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Gauge className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <CardTitle>Module Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={moduleVolume} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ClipboardCheck className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <CardTitle>Compliance Load</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={complianceItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <FileText className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <CardTitle>Approvals by Module</CardTitle>
          </CardHeader>
          <CardContent>
            {approvalItems.length > 0 ? (
              <BarList items={approvalItems} />
            ) : (
              <p className="text-body text-muted-foreground">No pending approvals by module.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
