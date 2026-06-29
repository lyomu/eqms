"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface IsoReadinessItem {
  code: string;
  label: string;
  status: "PASS" | "FAIL" | "WARN" | string;
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  required: boolean;
  evidenceCount: number;
  message: string;
}

export interface IsoReadiness {
  recordType: string;
  recordId: string;
  ready: boolean;
  score: number;
  items: IsoReadinessItem[];
  blockingMessages: string[];
}

interface IsoReadinessPanelProps {
  readiness?: IsoReadiness;
  isLoading?: boolean;
  isError?: boolean;
}

export function IsoReadinessPanel({ readiness, isLoading = false, isError = false }: IsoReadinessPanelProps) {
  return (
    <Card>
      <CardHeader><CardTitle>ISO Readiness</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-body text-muted-foreground">Checking readiness...</p>}
        {isError && <p className="text-body text-error">Readiness check is unavailable.</p>}
        {!isLoading && !isError && readiness && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-label ${readiness.ready ? "bg-success text-white" : "bg-error/15 text-error"}`}>
                {readiness.ready ? "Ready" : "Blocked"}
              </span>
              <span className="text-body text-muted-foreground">Score: {readiness.score}%</span>
            </div>
            {readiness.blockingMessages.length > 0 && (
              <div className="space-y-2">
                {readiness.blockingMessages.map((message) => (
                  <div key={message} className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-body text-error">
                    {message}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {readiness.items.map((item) => (
                <div key={item.code} className="rounded-md border border-border px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-label text-muted-foreground">
                        {item.required ? "Required" : "Conditional"} - {item.severity} - Evidence: {item.evidenceCount}
                      </div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-label ${item.status === "PASS" ? "bg-success text-white" : "bg-warning/20 text-[#8A6D00]"}`}>
                      {item.status === "PASS" ? "Pass" : item.status === "WARN" ? "Warn" : "Fail"}
                    </span>
                  </div>
                  <p className="mt-2 text-body text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
