"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { MODULE_LABELS, type TaskItem } from "@/types/dashboard";

interface TaskListCardProps {
  title: string;
  icon?: LucideIcon;
  items: TaskItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  emptyText: string;
  /** Treat due dates as overdue (renders them in the error color). */
  overdue?: boolean;
}

const DEFAULT_VISIBLE_ITEMS = 5;

/** Prettify a status enum name, e.g. PENDING_APPROVAL -> "Pending Approval". */
function prettyStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusVariant(status: string): BadgeProps["variant"] {
  const s = status.toUpperCase();
  if (s.includes("REJECT") || s.includes("CANCEL")) return "error";
  if (s.includes("APPROV") || s.includes("EFFECTIVE") || s.includes("RELEASED") || s.includes("CLOSED"))
    return "success";
  if (s.includes("PENDING") || s.includes("REVIEW") || s.includes("QUARANTINE")) return "warning";
  return "info";
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : dateFmt.format(d);
}

/** A dashboard card rendering a list of actionable records, with its own loading/error/empty states. */
export function TaskListCard({
  title,
  icon: Icon,
  items,
  isLoading,
  isError,
  emptyText,
  overdue,
}: TaskListCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items?.slice(0, DEFAULT_VISIBLE_ITEMS);
  const hiddenCount = Math.max((items?.length ?? 0) - DEFAULT_VISIBLE_ITEMS, 0);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <CardTitle className="text-h3">{title}</CardTitle>
        {items && items.length > 0 && (
          <Badge variant="neutral" className="ml-auto">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading && <LoadingSpinner label={`Loading ${title.toLowerCase()}…`} />}

        {isError && !isLoading && (
          <ErrorAlert title="Couldn't load" message={`Unable to load ${title.toLowerCase()}.`} />
        )}

        {!isLoading && !isError && (!items || items.length === 0) && (
          <p className="py-2 text-body text-muted-foreground">{emptyText}</p>
        )}

        {!isLoading && !isError && visibleItems && visibleItems.length > 0 && (
          <div className="space-y-3">
            <ul className="divide-y divide-border">
              {visibleItems.map((item) => {
              const due = formatDate(item.dueDate);
              return (
                <li
                  key={`${item.module}-${item.recordId ?? item.recordNumber}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium">{item.recordNumber}</p>
                    <p className="text-label text-muted-foreground">
                      {MODULE_LABELS[item.module] ?? item.module}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {due && (
                      <span className={overdue ? "text-label text-error" : "text-label text-muted-foreground"}>
                        {overdue ? "Due " : "Due "}
                        {due}
                      </span>
                    )}
                    <Badge variant={statusVariant(item.status)}>{prettyStatus(item.status)}</Badge>
                  </div>
                </li>
              );
              })}
            </ul>
            {hiddenCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Show less" : `View ${hiddenCount} more`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
