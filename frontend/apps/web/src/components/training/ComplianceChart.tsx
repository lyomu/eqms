import { ProgressBar } from "@/components/training/TrainingBadges";
import type { ComplianceStatus } from "@/types/training";

export function ComplianceChart({ data }: { data: ComplianceStatus | undefined }) {
  const rows = [
    { role: "Assigned", value: data?.assigned ?? 0, tone: "bg-brand-primary" },
    { role: "In Progress", value: data?.inProgress ?? 0, tone: "bg-warning" },
    { role: "Completed", value: data?.completed ?? 0, tone: "bg-success" },
    { role: "Overdue", value: data?.overdue ?? 0, tone: "bg-error" },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 items-end gap-3 h-40">
        {rows.map((r) => (
          <div key={r.role} className="flex h-full flex-col justify-end gap-2">
            <div className={`${r.tone} rounded-sm`} style={{ height: `${Math.max(8, (r.value / max) * 128)}px` }} />
            <span className="text-center text-label text-muted-foreground">{r.role}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 flex justify-between text-label"><span>Overall completion</span><span>{data?.completionRatePct ?? 0}%</span></div>
        <ProgressBar value={data?.completionRatePct ?? 0} />
      </div>
    </div>
  );
}
