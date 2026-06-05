"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Post-login landing ("My Work"-style placeholder). The real dashboard (KPI cards,
 * pending work) lands in Milestone 1 — this confirms the authenticated shell works.
 */
export default function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">My Work</h1>
        <p className="text-body text-muted-foreground">
          Welcome back{currentUser ? `, ${currentUser.fullName}` : ""}. The dashboard arrives in
          Milestone 1.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-body text-muted-foreground">
            You are authenticated against the Spring Boot backend via a session cookie. Navigation,
            design tokens, and the API layer are wired up.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Authenticated</Badge>
            <Badge variant="info">Session active</Badge>
            <Badge variant="neutral">Milestone 0</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
