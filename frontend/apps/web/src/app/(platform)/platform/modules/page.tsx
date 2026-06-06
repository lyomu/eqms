"use client";

import { Blocks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { usePlatformModules } from "@/hooks/usePlatformAdmin";

export default function PlatformModulesPage() {
  const modules = usePlatformModules();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">Modules</h1>
        <p className="text-body text-muted-foreground">Licensed eQMS module catalog.</p>
      </div>

      {modules.isLoading ? <LoadingScreen label="Loading modules" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(modules.data ?? []).map((module) => (
            <Card key={module.code}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-light text-brand-primary">
                  <Blocks className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-medium">{module.name}</p>
                    <Badge variant={module.active ? "success" : "neutral"}>{module.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-label text-muted-foreground">{module.code}</p>
                  <p className="mt-1 text-body text-muted-foreground">{module.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
