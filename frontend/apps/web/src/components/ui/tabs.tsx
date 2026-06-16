"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Accessible underline tab bar (ARIA tablist). The panel content is rendered by the caller. */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2 text-body transition-colors",
              selected
                ? "border-brand-primary font-medium text-brand-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="ml-1.5 text-label text-muted-foreground">({tab.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
