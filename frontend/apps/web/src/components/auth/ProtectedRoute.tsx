"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui/loading-spinner";

/**
 * Gate for authenticated areas. Waits for GET /api/auth/me, redirects to /login if
 * unauthenticated. NOTE: this is UX only — the backend enforces real authorization on
 * every endpoint (frontend rule 5). Never use this for permission decisions.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingScreen label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    // Redirect is in flight; render nothing to avoid a flash of protected content.
    return null;
  }

  return <>{children}</>;
}
