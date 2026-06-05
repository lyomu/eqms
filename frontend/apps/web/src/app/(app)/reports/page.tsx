"use client";

import Link from "next/link";
import { FileBarChart, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { REPORTS } from "@/types/report";

export default function ReportsHubPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">Reports</h1>
        <p className="text-body text-muted-foreground">Generate and export quality reports (requires audit-view permission).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.slug} href={`/reports/${r.slug}`} className="group">
            <Card className="h-full p-4 transition-colors hover:border-brand-secondary">
              <CardContent className="flex flex-col gap-2 p-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-light text-brand-primary">
                  <FileBarChart className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-h3 text-brand-primary">{r.title}</p>
                <p className="text-body text-muted-foreground">{r.description}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-label font-medium text-brand-secondary group-hover:underline">
                  View report <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
