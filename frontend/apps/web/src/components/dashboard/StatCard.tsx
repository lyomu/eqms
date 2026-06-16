import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  /** Optional secondary line, e.g. "30 effective". */
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  tone?: "blue" | "teal" | "green" | "amber" | "red" | "violet" | "slate";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, { card: string; icon: string }> = {
  blue: { card: "from-blue-50 to-white", icon: "bg-blue-100 text-blue-700" },
  teal: { card: "from-teal-50 to-white", icon: "bg-teal-100 text-teal-700" },
  green: { card: "from-green-50 to-white", icon: "bg-green-100 text-green-700" },
  amber: { card: "from-amber-50 to-white", icon: "bg-amber-100 text-amber-700" },
  red: { card: "from-red-50 to-white", icon: "bg-red-100 text-red-700" },
  violet: { card: "from-violet-50 to-white", icon: "bg-violet-100 text-violet-700" },
  slate: { card: "from-slate-50 to-white", icon: "bg-slate-100 text-slate-700" },
};

/** Compact KPI card for the dashboard stats row. */
export function StatCard({ label, value, hint, icon: Icon, className, tone = "blue" }: StatCardProps) {
  const classes = toneClasses[tone];

  return (
    <Card
      className={cn(
        "group overflow-hidden bg-gradient-to-br p-4 transition-shadow hover:shadow-md",
        classes.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-h1 font-bold text-foreground">{value}</p>
          {hint && <p className="text-label text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
              classes.icon
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </Card>
  );
}
