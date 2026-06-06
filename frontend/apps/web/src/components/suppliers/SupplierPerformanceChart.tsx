import type { SupplierPerformance } from "@/types/supplier";

export function SupplierPerformanceChart({ data }: { data: SupplierPerformance[] | undefined }) {
  const rows = [...(data ?? [])].reverse().slice(-6);
  if (rows.length === 0) return <p className="text-body text-muted-foreground">No performance data yet.</p>;
  const width = 520;
  const height = 180;
  const x = (i: number) => 28 + (i * (width - 56)) / Math.max(rows.length - 1, 1);
  const y = (v: number | null) => height - 24 - ((v ?? 0) * (height - 48)) / 100;
  const path = (key: "onTimeDeliveryPct" | "qualityAcceptancePct") => rows.map((r, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(Number(r[key] ?? 0))}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 min-w-[520px] w-full" role="img" aria-label="Supplier performance trend">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1="28" x2={width - 20} y1={y(v)} y2={y(v)} className="stroke-border" />
            <text x="0" y={y(v) + 4} className="fill-muted-foreground text-[11px]">{v}</text>
          </g>
        ))}
        <path d={path("onTimeDeliveryPct")} fill="none" className="stroke-brand-primary" strokeWidth="3" />
        <path d={path("qualityAcceptancePct")} fill="none" className="stroke-success" strokeWidth="3" />
        {rows.map((r, i) => (
          <g key={r.id}>
            <circle cx={x(i)} cy={y(Number(r.onTimeDeliveryPct ?? 0))} r="4" className="fill-brand-primary" />
            <circle cx={x(i)} cy={y(Number(r.qualityAcceptancePct ?? 0))} r="4" className="fill-success" />
            <text x={x(i) - 18} y={height - 4} className="fill-muted-foreground text-[11px]">{r.assessmentPeriodEnd ? new Date(r.assessmentPeriodEnd).toLocaleDateString("en-GB", { month: "short" }) : "Q"}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-label text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-5 rounded-sm bg-brand-primary" />Delivery %</span>
        <span><span className="mr-1 inline-block h-2 w-5 rounded-sm bg-success" />Quality %</span>
      </div>
    </div>
  );
}
